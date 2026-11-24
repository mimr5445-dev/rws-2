import { ActorPack, ActorTemplate, MapPack, PackBundle, SavedScenarioRecord } from '../core/types';
import { buildWorldMapPack } from '../maps/worldGeoEngine';
import { buildWorldPoliticalBoard } from '../maps/worldPoliticalBoard';
import { WORLD_CLASSIC_MAP_ID, WORLD_PACIFIC_MAP_ID } from '../maps/worldMapIds';
import { studioDb } from '../storage/studioDb';
import { STUDIO_ACTORS, STUDIO_TEMPLATES } from './studioUnits';
import { validatePackBundle } from './packSchema';

export const ACTOR_TEMPLATES: Record<string, ActorTemplate> = STUDIO_TEMPLATES;

const LEGACY_PRESET_IDS = new Set([
  'preset_air_sea',
  'preset_world',
  'preset_strait',
  'preset_valley'
]);

export class PackRegistry {
  public maps: Record<string, MapPack> = {};
  public actors: Record<string, ActorPack> = {};
  public scenarios: SavedScenarioRecord[] = [];
  public actorOverrides = new Set<string>();

  constructor(private useStorage = true) {
    const politicalBoard = buildWorldPoliticalBoard();
    this.maps[politicalBoard.id] = politicalBoard;
    if (typeof document !== 'undefined') {
      const pacificMap = buildWorldMapPack({
        skin: 'pacific_briefing',
        id: WORLD_PACIFIC_MAP_ID,
        title: 'خريطة العالم — لوح المحيط الهادئ'
      });
      this.maps[pacificMap.id] = pacificMap;
      const classicMap = buildWorldMapPack({
        skin: 'classic',
        id: WORLD_CLASSIC_MAP_ID,
        title: 'خريطة العالم التفاعلية'
      });
      this.maps[classicMap.id] = classicMap;
    }
    for (const [k, a] of Object.entries(STUDIO_ACTORS)) {
      this.actors[k] = { ...a, ability: a.ability ? { ...a.ability } : undefined };
    }
  }

  async init(presetScenarios: SavedScenarioRecord[] = []): Promise<void> {
    if (typeof document !== 'undefined' && !this.maps[WORLD_PACIFIC_MAP_ID]) {
      const pacificMap = buildWorldMapPack({
        skin: 'pacific_briefing',
        id: WORLD_PACIFIC_MAP_ID,
        title: 'خريطة العالم — لوح المحيط الهادئ'
      });
      this.maps[pacificMap.id] = pacificMap;
    }
    if (typeof document !== 'undefined' && !this.maps[WORLD_CLASSIC_MAP_ID]) {
      const classicMap = buildWorldMapPack({
        skin: 'classic',
        id: WORLD_CLASSIC_MAP_ID,
        title: 'خريطة العالم التفاعلية'
      });
      this.maps[classicMap.id] = classicMap;
    }

    if (!this.useStorage) {
      this.scenarios = [...presetScenarios];
      return;
    }

    // تحميل محافظات الدول فقط (مع تجاهل الخرائط القديمة غير العالمية)
    const savedMaps = await studioDb.loadAllMaps();
    for (const m of savedMaps) {
      if (m.geoLevel === 'country') {
        this.maps[m.id] = m;
      }
    }

    // تحميل تخصيصات وإضافات الآليات والمباني المحفوظة في قاعدة البيانات
    const savedActors = await studioDb.loadAllActors();
    for (const a of savedActors) {
      if (a && typeof a.id === 'string' && typeof a.svg === 'string') {
        this.actors[a.id] = {
          ...a,
          ability: a.ability ? { ...a.ability } : undefined
        };
        this.actorOverrides.add(a.id);
      }
    }

    // الإبقاء على السيناريوهات التي أنشأها المستخدم فقط وحذف أي سيناريوهات مسبقة قديمة
    const savedScenarios = await studioDb.loadAllScenarios();
    const userScenarios: SavedScenarioRecord[] = [];
    for (const s of savedScenarios) {
      if (s.source === 'preset' || LEGACY_PRESET_IDS.has(s.id)) {
        await studioDb.deleteScenario(s.id);
      } else {
        userScenarios.push(s);
      }
    }
    this.scenarios = userScenarios.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async saveCustomMap(map: MapPack): Promise<void> {
    this.maps[map.id] = map;
    if (this.useStorage) {
      await studioDb.saveMap(map);
    }
  }

  isBuiltInActor(id: string): boolean {
    return Object.prototype.hasOwnProperty.call(STUDIO_ACTORS, id);
  }

  hasActorOverride(id: string): boolean {
    return this.actorOverrides.has(id);
  }

  async saveCustomActor(
    actor: Partial<ActorPack> & { id: string; label: string; svg: string }
  ): Promise<ActorPack> {
    const existing = this.actors[actor.id];
    const tpl = actor.extends ? ACTOR_TEMPLATES[actor.extends] : ACTOR_TEMPLATES._person;
    const base = existing ?? tpl ?? ACTOR_TEMPLATES._person;
    const resolved: ActorPack = {
      ...base,
      ...actor,
      ability: actor.ability ? { ...actor.ability } : existing?.ability ? { ...existing.ability } : undefined
    };
    this.actors[resolved.id] = resolved;
    this.actorOverrides.add(resolved.id);
    if (this.useStorage) {
      await studioDb.saveActor(resolved);
    }
    return resolved;
  }

  async resetOrDeleteActor(id: string): Promise<'reset' | 'deleted' | 'none'> {
    if (this.useStorage) {
      await studioDb.deleteActor(id);
    }
    this.actorOverrides.delete(id);
    if (this.isBuiltInActor(id)) {
      const def = STUDIO_ACTORS[id];
      this.actors[id] = { ...def, ability: def.ability ? { ...def.ability } : undefined };
      return 'reset';
    }
    if (this.actors[id]) {
      delete this.actors[id];
      return 'deleted';
    }
    return 'none';
  }

  async saveScenarioRecord(rec: SavedScenarioRecord): Promise<void> {
    if (this.useStorage) {
      await studioDb.saveScenario(rec);
    }
    this.scenarios = [rec, ...this.scenarios.filter((s) => s.id !== rec.id)].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async deleteScenarioRecord(id: string): Promise<void> {
    if (this.useStorage) {
      await studioDb.deleteScenario(id);
    }
    this.scenarios = this.scenarios.filter((s) => s.id !== id);
  }

  async importBundle(bundle: PackBundle): Promise<{ mapsAdded: number; actorsAdded: number }> {
    const errors = validatePackBundle(bundle);
    if (errors.length > 0) throw new Error(errors.slice(0, 5).join(' | '));
    for (const m of bundle.maps ?? []) await this.saveCustomMap(m);
    for (const a of bundle.actors ?? []) await this.saveCustomActor(a);
    return { mapsAdded: bundle.maps?.length ?? 0, actorsAdded: bundle.actors?.length ?? 0 };
  }

  exportCurrentBundle(): PackBundle {
    const maps = Object.values(this.maps)
      .filter((m) => !m.geoLevel && m.id !== 'world_political_board')
      .map(({ hitTest: _ht, regions: _regs, ...rest }) => rest);
    return {
      maps,
      actors: Object.values(this.actors)
    };
  }
}
