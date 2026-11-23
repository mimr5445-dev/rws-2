import { findPath } from './pathfinding';
import {
  ActorPack,
  ArrowState,
  CalloutState,
  CameraTarget,
  CraterDecal,
  EntityState,
  ExplosionState,
  MapPack,
  MuzzleFlashState,
  Order,
  ProjectileState,
  PulseState,
  ScenarioFile,
  SoundEventMeta,
  SoundId,
  ZoneVisualState
} from '../core/types';
import { CombatContext, processStrikeOrder, stepCombatAndEffects } from './engineCombat';
import { stepEntitiesMovement } from './engineMovement';
import { DT, TICK_RATE, normalizeAngleDiff, parseSec, parseStrictSec } from './engineTime';
import { collectReservedExplicitIds, createCameraTarget, executeScenarioStep } from './engineTimeline';

export { DT, TICK_RATE, normalizeAngleDiff, parseSec, parseStrictSec };

export class StudioEngine {
  public tick = 0;
  public entities = new Map<string, EntityState>();
  public arrows = new Map<string, ArrowState>();
  public zones = new Map<string, ZoneVisualState>();
  public callouts = new Map<string, CalloutState>();
  public pulses: PulseState[] = [];
  public projectiles: ProjectileState[] = [];
  public muzzleFlashes: MuzzleFlashState[] = [];
  public explosions: ExplosionState[] = [];
  public craters: CraterDecal[] = [];
  public caption = '';
  public cameraTarget: CameraTarget | null = null;

  private executedSteps = new Set<number>();
  private orderQueue: Order[] = [];
  private soundListeners: Array<(id: SoundId, meta?: SoundEventMeta) => void> = [];
  private blockedListeners: Array<(entity: EntityState) => void> = [];
  private autoCounter = 0;
  private constructAutoSeq = 0;
  private reservedExplicitIds = new Set<string>();
  private usedAutoIds = new Set<string>();
  private repathCooldownTick = new Map<string, number>();
  private silent = false;

  constructor(
    public map: MapPack,
    public actors: Record<string, ActorPack>,
    public scenario: ScenarioFile
  ) {
    this.reset();
  }

  onSound(cb: (id: SoundId, meta?: SoundEventMeta) => void): () => void {
    this.soundListeners.push(cb);
    return () => {
      this.soundListeners = this.soundListeners.filter((l) => l !== cb);
    };
  }

  onMoveBlocked(cb: (entity: EntityState) => void): () => void {
    this.blockedListeners.push(cb);
    return () => {
      this.blockedListeners = this.blockedListeners.filter((l) => l !== cb);
    };
  }

  private emitSound(id: SoundId, meta?: SoundEventMeta): void {
    if (this.silent) return;
    this.soundListeners.forEach((cb) => cb(id, meta));
  }

  private nextAutoId = (prefix: string): string => `${prefix}_${++this.autoCounter}`;

  get executedStepCount(): number {
    return this.executedSteps.size;
  }

  get totalStepCount(): number {
    return Array.isArray(this.scenario.timeline) ? this.scenario.timeline.length : 0;
  }

  estimateDurationSec(): number {
    const hint = parseStrictSec(this.scenario.meta?.duration_hint);
    let maxAt = Math.max(18, hint ?? 18);
    const steps = Array.isArray(this.scenario.timeline) ? this.scenario.timeline : [];
    for (const st of steps) {
      if (st?.at !== undefined) {
        const atSec = parseStrictSec(st.at);
        if (atSec !== null) maxAt = Math.max(maxAt, atSec + 8);
      }
    }
    return maxAt;
  }

  seekToTick(targetTick: number): void {
    const clamped = Math.max(0, Math.floor(targetTick));
    const prevSilent = this.silent;
    this.silent = true;
    try {
      if (clamped < this.tick) this.reset();
      while (this.tick < clamped) this.step();
    } finally {
      this.silent = prevSilent;
    }
  }

  reset(): void {
    this.tick = 0;
    this.entities.clear();
    this.arrows.clear();
    this.zones.clear();
    this.callouts.clear();
    this.pulses = [];
    this.projectiles = [];
    this.muzzleFlashes = [];
    this.explosions = [];
    this.craters = [];
    this.executedSteps.clear();
    this.orderQueue = [];
    this.caption = '';
    this.cameraTarget = null;
    this.autoCounter = 0;
    this.constructAutoSeq = 0;
    this.usedAutoIds.clear();
    this.repathCooldownTick.clear();
    this.reservedExplicitIds = collectReservedExplicitIds(this.scenario);
    for (const z of Object.values(this.map.zones)) {
      this.zones.set(z.id, { id: z.id, color: '#3b82f6', targetOpacity: 0, opacity: 0, prevOpacity: 0, rate: 0 });
    }
    this.evaluateTimeline();
    this.processOrders();
  }

  dispatchOrder(order: Order): void {
    this.orderQueue.push(order);
  }

  flushOrders(): void {
    this.processOrders();
  }

  private removeEntityWithCallouts = (entityId: string): void => {
    this.entities.delete(entityId);
    for (const [cid, c] of this.callouts) {
      if (c.target === entityId && !this.map.anchors[c.target]) {
        this.callouts.delete(cid);
      }
    }
  };

  private createCombatContext(): CombatContext {
    const engine = this;
    return {
      map: this.map,
      entities: this.entities,
      arrows: this.arrows,
      zones: this.zones,
      callouts: this.callouts,
      pulses: this.pulses,
      get projectiles() {
        return engine.projectiles;
      },
      set projectiles(val) {
        engine.projectiles = val;
      },
      get muzzleFlashes() {
        return engine.muzzleFlashes;
      },
      set muzzleFlashes(val) {
        engine.muzzleFlashes = val;
      },
      get explosions() {
        return engine.explosions;
      },
      set explosions(val) {
        engine.explosions = val;
      },
      get craters() {
        return engine.craters;
      },
      set craters(val) {
        engine.craters = val;
      },
      nextAutoId: this.nextAutoId,
      emitSound: (id, meta) => this.emitSound(id, meta),
      removeEntityWithCallouts: this.removeEntityWithCallouts
    };
  }

  step(): void {
    this.tick++;
    this.evaluateTimeline();
    this.processOrders();

    stepEntitiesMovement({
      map: this.map,
      tick: this.tick,
      entities: this.entities,
      projectiles: this.projectiles,
      repathCooldownTick: this.repathCooldownTick,
      nextAutoId: this.nextAutoId,
      emitSound: (id, meta) => this.emitSound(id, meta)
    });

    stepCombatAndEffects(this.createCombatContext());
  }

  private evaluateTimeline(): void {
    const timeSec = this.tick * DT;
    const steps = Array.isArray(this.scenario.timeline) ? this.scenario.timeline : [];

    steps.forEach((st, idx) => {
      if (!st || this.executedSteps.has(idx)) return;
      let ready = false;

      if (st.at !== undefined) {
        const atSec = parseStrictSec(st.at);
        if (atSec !== null && timeSec >= atSec) {
          ready = true;
        }
      } else if (typeof st.after === 'string') {
        const dotIdx = st.after.indexOf('.');
        const entityId = dotIdx > 0 ? st.after.slice(0, dotIdx) : '';
        const event = dotIdx > 0 ? st.after.slice(dotIdx + 1) : '';
        const ent = entityId ? this.entities.get(entityId) : undefined;
        if (event === 'arrived' && ent && ent.arrivedTick !== null && !ent.isMoving) {
          ready = true;
        } else if (event === 'built' && ent && ent.builtTick !== null && ent.buildProgress >= 1) {
          ready = true;
        }
      }

      if (ready) {
        this.executedSteps.add(idx);
        executeScenarioStep(
          {
            map: this.map,
            actors: this.actors,
            entities: this.entities,
            arrows: this.arrows,
            zones: this.zones,
            callouts: this.callouts,
            pulses: this.pulses,
            reservedExplicitIds: this.reservedExplicitIds,
            usedAutoIds: this.usedAutoIds,
            nextConstructId: () => {
              let constructId: string;
              do {
                constructId = `bld_${++this.constructAutoSeq}`;
              } while (
                this.reservedExplicitIds.has(constructId) ||
                this.entities.has(constructId) ||
                this.usedAutoIds.has(constructId)
              );
              this.usedAutoIds.add(constructId);
              return constructId;
            },
            setCaption: (caption) => {
              this.caption = caption;
            },
            advanceCameraTarget: (x, y, zoom, durationSec) => {
              this.cameraTarget = createCameraTarget(this.cameraTarget, x, y, zoom, durationSec);
            },
            dispatchOrder: (order) => this.dispatchOrder(order),
            emitSound: (id, meta) => this.emitSound(id, meta)
          },
          st
        );
      }
    });
  }

  private processOrders(): void {
    while (this.orderQueue.length > 0) {
      const ord = this.orderQueue.shift()!;
      if (ord.type === 'spawn') {
        if (!ord.id || typeof ord.id !== 'string' || !ord.id.trim() || this.entities.has(ord.id)) continue;
        const act = this.actors[ord.actorId];
        if (!act) continue;
        this.entities.set(ord.id, {
          id: ord.id,
          actorId: ord.actorId,
          kind: act.kind,
          domain: act.domain,
          faction: ord.faction,
          x: ord.at.x,
          y: ord.at.y,
          prevX: ord.at.x,
          prevY: ord.at.y,
          angle: 0,
          prevAngle: 0,
          currentSpeed: 0,
          altitude: 0,
          prevAltitude: 0,
          bankAngle: 0,
          prevBankAngle: 0,
          path: [],
          speed: act.speed,
          turnRate: act.turnRate,
          scale: act.scale,
          scaleMul: ord.scale !== undefined ? Math.max(0.25, Math.min(3.5, ord.scale)) : 1,
          radius: act.radius,
          buildProgress: 1,
          prevBuildProgress: 1,
          buildRate: 1,
          isMoving: false,
          arrivedTick: null,
          builtTick: null,
          homeX: ord.at.x,
          homeY: ord.at.y,
          pendingStrike: null
        });
        this.emitSound('spawn_pop', { actorId: ord.actorId, eventKind: 'spawn' });
      } else if (ord.type === 'construct') {
        if (!ord.id || typeof ord.id !== 'string' || !ord.id.trim() || this.entities.has(ord.id)) continue;
        const act = this.actors[ord.actorId];
        if (!act) continue;
        this.entities.set(ord.id, {
          id: ord.id,
          actorId: ord.actorId,
          kind: 'building',
          domain: 'land',
          faction: ord.faction,
          x: ord.at.x,
          y: ord.at.y,
          prevX: ord.at.x,
          prevY: ord.at.y,
          angle: 0,
          prevAngle: 0,
          currentSpeed: 0,
          altitude: 0,
          prevAltitude: 0,
          bankAngle: 0,
          prevBankAngle: 0,
          path: [],
          speed: 0,
          turnRate: 0,
          scale: act.scale,
          scaleMul: ord.scale !== undefined ? Math.max(0.25, Math.min(3.5, ord.scale)) : 1,
          radius: act.radius,
          buildProgress: 0,
          prevBuildProgress: 0,
          buildRate: 1 / Math.max(0.2, ord.durationSec),
          isMoving: false,
          arrivedTick: null,
          builtTick: null,
          homeX: ord.at.x,
          homeY: ord.at.y,
          pendingStrike: null
        });
      } else if (ord.type === 'resize') {
        const ent = this.entities.get(ord.entityId);
        if (ent && Number.isFinite(ord.scale)) {
          ent.scaleMul = Math.max(0.25, Math.min(3.5, ord.scale));
        }
      } else if (ord.type === 'move') {
        const ent = this.entities.get(ord.entityId);
        if (!ent || ent.kind === 'building') continue;
        const path = findPath(this.map, { x: ent.x, y: ent.y }, ord.to, ent.domain);
        if (path.length === 0) {
          if (!this.silent) this.blockedListeners.forEach((cb) => cb(ent));
          continue;
        }
        ent.arrivedTick = null;
        ent.pendingStrike = null;
        ent.path = path;
        if (ent.kind === 'air') {
          ent.homeX = ord.to.x;
          ent.homeY = ord.to.y;
          this.emitSound('jet_takeoff', { actorId: ent.actorId, eventKind: 'move' });
        } else if (ent.kind === 'ship') this.emitSound('ship_horn', { actorId: ent.actorId, eventKind: 'move' });
        else this.emitSound('move_order', { actorId: ent.actorId, eventKind: 'move' });
      } else if (ord.type === 'strike') {
        processStrikeOrder(this.createCombatContext(), ord);
      } else if (ord.type === 'remove') {
        this.removeEntityWithCallouts(ord.entityId);
      }
    }
  }
}
