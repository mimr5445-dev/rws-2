import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { frameRateIndependentEase } from '../../core/cameraTransform';
import { EntityState, Point } from '../../core/types';
import { StudioEngine } from '../../engine/engine';
import {
  CalloutView,
  EntityView,
  FACTION_COLOR,
  Particle,
  WakeRipple,
  lerp,
  lerpAngle
} from './rendererUtils';

export function drawCornerBrackets(
  g: Graphics,
  hw: number,
  hh: number,
  arm: number,
  color: number,
  width: number,
  alpha: number
): void {
  const a = Math.min(arm, hw * 0.65, hh * 0.65);
  g.moveTo(-hw, -hh + a).lineTo(-hw, -hh).lineTo(-hw + a, -hh)
    .moveTo(hw - a, -hh).lineTo(hw, -hh).lineTo(hw, -hh + a)
    .moveTo(hw, hh - a).lineTo(hw, hh).lineTo(hw - a, hh)
    .moveTo(-hw + a, hh).lineTo(-hw, hh).lineTo(-hw, hh - a)
    .stroke({ width, color, alpha });
}

export function createEntityView(ent: EntityState, actorTextures: Map<string, Texture>): EntityView {
  const container = new Container();
  const tex = actorTextures.get(ent.actorId) ?? Texture.EMPTY;
  const ratio = ent.scale / Math.max(1, tex.width, tex.height);
  const drawW = Math.max(ent.radius * 1.4, tex.width * ratio);
  const drawH = Math.max(ent.radius * 1.0, tex.height * ratio);

  const shadow = new Graphics()
    .ellipse(0, ent.kind === 'air' ? 8 : ent.scale * 0.16, drawW * 0.44, drawH * 0.34)
    .fill({ color: 0x000000, alpha: ent.kind === 'air' ? 0.38 : 0.32 });

  const isElongated = drawW > drawH * 1.35;
  const isSideView = ent.actorId === 'supply_convoy';
  const hw = Math.max(12, drawW * 0.52);
  const hh = Math.max(10, drawH * 0.54);
  const factionHalo = new Graphics();
  const ring = new Graphics();
  const fCol = FACTION_COLOR[ent.faction] ?? 0x94a3b8;
  drawCornerBrackets(factionHalo, hw, hh, 5.5, fCol, 1.5, 0.52);
  drawCornerBrackets(ring, hw + 4, hh + 4, 8, 0x22c55e, 2.2, 0.95);
  ring.visible = false;
  const buildArc = new Graphics();

  const sprite = new Sprite(tex);
  sprite.anchor.set(0.5);
  sprite.scale.set(ratio);

  let rotor: Graphics | undefined;
  // The detailed Apache sprite includes its rotor blades; keep the procedural rotor for the vector fallback.
  if (ent.actorId === 'attack_heli') {
    rotor = new Graphics()
      .poly([-20, -1.4, -4, -0.8, -4, 0.8, -20, 1.4])
      .fill({ color: 0x94a3b8, alpha: 0.78 })
      .poly([4, -0.8, 20, -1.4, 20, 1.4, 4, 0.8])
      .fill({ color: 0x94a3b8, alpha: 0.78 })
      .poly([-1.4, -20, 1.4, -20, 0.8, -4, -0.8, -4])
      .fill({ color: 0x94a3b8, alpha: 0.78 })
      .poly([-0.8, 4, 0.8, 4, 1.4, 20, -1.4, 20])
      .fill({ color: 0x94a3b8, alpha: 0.78 })
      .circle(-19.5, 0, 1.2).fill({ color: 0xfacc15, alpha: 0.85 })
      .circle(19.5, 0, 1.2).fill({ color: 0xfacc15, alpha: 0.85 })
      .circle(0, -19.5, 1.2).fill({ color: 0xfacc15, alpha: 0.85 })
      .circle(0, 19.5, 1.2).fill({ color: 0xfacc15, alpha: 0.85 })
      .circle(0, 0, 2.8)
      .fill({ color: 0x475569 })
      .stroke({ width: 1, color: 0xe2e8f0, alpha: 0.85 });
    rotor.position.set(1, 0);
  }

  if (rotor) {
    container.addChild(shadow, factionHalo, ring, sprite, rotor, buildArc);
  } else {
    container.addChild(shadow, factionHalo, ring, sprite, buildArc);
  }
  return { container, sprite, baseSpriteScale: ratio, isElongated, isSideView, shadow, ring, factionHalo, buildArc, rotor };
}

export interface EntitiesRenderInput {
  engine: StudioEngine;
  alpha: number;
  timeSec: number;
  safeDt: number;
  isPlaying: boolean;
  camZoom: number;
  userUnitScale: number;
  worldRotation: number;
  tiltCompY: number;
  hideUIHelpers: boolean;
  selectedEntityId: string | null;
  actorTextures: Map<string, Texture>;
  entityViews: Map<string, EntityView>;
  calloutViews: Map<string, CalloutView>;
  particles: Particle[];
  wakeRipples: WakeRipple[];
  entityLayer: Container;
  calloutLayer: Container;
  wakeGraphics: Graphics;
  particleGraphics: Graphics;
  worldToScreen: (pt: Point) => Point;
  lastEmittedSelPos: { id: string; x: number; y: number } | null;
  onSelectedScreenPos?: (pos: { id: string; x: number; y: number; offsetPx: number } | null) => void;
}

export function renderEntitiesAndCallouts(input: EntitiesRenderInput): {
  lastUnitFactor: number;
  lastEmittedSelPos: { id: string; x: number; y: number } | null;
} {
  const {
    engine,
    alpha,
    timeSec,
    safeDt,
    isPlaying,
    camZoom,
    userUnitScale,
    worldRotation,
    tiltCompY,
    hideUIHelpers,
    selectedEntityId,
    actorTextures,
    entityViews,
    calloutViews,
    particles,
    wakeRipples,
    entityLayer,
    calloutLayer,
    wakeGraphics,
    particleGraphics,
    worldToScreen,
    onSelectedScreenPos
  } = input;

  for (const [id, v] of entityViews) {
    if (!engine.entities.has(id)) {
      entityLayer.removeChild(v.container);
      v.container.destroy({ children: true });
      entityViews.delete(id);
    }
  }

  const mapMul = engine.map.unitScaleMultiplier ?? 1;
  const zoomComp = Math.max(0.45, Math.min(1.25, 1 / Math.pow(camZoom, 0.4)));
  const lastUnitFactor = mapMul * userUnitScale * zoomComp;

  for (const ent of engine.entities.values()) {
    let view = entityViews.get(ent.id);
    if (!view) {
      view = createEntityView(ent, actorTextures);
      entityViews.set(ent.id, view);
      entityLayer.addChild(view.container);
    }

    const x = lerp(ent.prevX, ent.x, alpha);
    const y = lerp(ent.prevY, ent.y, alpha);
    const alt = lerp(ent.prevAltitude, ent.altitude, alpha);
    const smoothAng = lerpAngle(ent.prevAngle, ent.angle, alpha);

    const entScale = lastUnitFactor * (ent.scaleMul ?? 1);
    view.container.position.set(x, y);
    view.container.scale.set(entScale * (1 + alt * 0.28));

    if (ent.kind === 'air') {
      view.shadow.position.set(alt * 28, 8 + alt * 34);
      view.shadow.rotation = smoothAng;
      view.shadow.alpha = Math.max(0.22, 0.45 - alt * 0.16);
      view.shadow.scale.set(1 + alt * 0.14);
      view.factionHalo.rotation = smoothAng;
      view.ring.rotation = smoothAng;
    } else if (ent.kind === 'ship' || ent.kind === 'vehicle') {
      view.shadow.position.set(2, ent.scale * 0.16);
      view.shadow.rotation = view.isSideView ? 0 : smoothAng;
      view.factionHalo.rotation = view.isSideView ? 0 : smoothAng;
      view.ring.rotation = view.isSideView ? 0 : smoothAng;
    }

    if (ent.kind === 'person') {
      const bob = ent.isMoving ? Math.abs(Math.sin(timeSec * 12)) * 3 : 0;
      view.sprite.y = -bob;
      view.sprite.rotation = -worldRotation + (ent.isMoving ? Math.sin(timeSec * 12) * 0.08 : 0);
    } else if (ent.kind === 'vehicle' && view.isSideView) {
      const bounce = ent.isMoving ? Math.abs(Math.sin(timeSec * 15)) * 1.1 : 0;
      const screenCos = Math.cos(smoothAng + worldRotation);
      const facingRight = screenCos > 0.18;
      view.sprite.y = -bounce;
      view.sprite.rotation = -worldRotation + (ent.isMoving ? Math.sin(timeSec * 10) * 0.025 : 0);
      view.sprite.scale.set(facingRight ? -view.baseSpriteScale : view.baseSpriteScale, view.baseSpriteScale);
    } else if (ent.kind === 'vehicle' || ent.kind === 'ship') {
      view.sprite.rotation = smoothAng;
    } else if (ent.kind === 'air') {
      view.sprite.rotation = smoothAng;
      const smoothBank = lerp(ent.prevBankAngle, ent.bankAngle, alpha);
      const bankSquash = Math.max(0.76, 1 - Math.abs(smoothBank) * 0.28);
      view.sprite.scale.set(view.baseSpriteScale, view.baseSpriteScale * bankSquash);
      if (view.rotor) {
        view.rotor.rotation = timeSec * (ent.isMoving || alt > 0.05 ? 24 : 7);
      }
    }

    if (isPlaying && ent.domain === 'sea') {
      if (ent.isMoving && Math.random() < frameRateIndependentEase(24, safeDt) && wakeRipples.length < 160) {
        wakeRipples.push({
          x: x - Math.cos(smoothAng) * (ent.radius * 0.72 * entScale),
          y: y - Math.sin(smoothAng) * (ent.radius * 0.72 * entScale),
          angle: smoothAng,
          width: Math.max(8, ent.radius * 0.55 * entScale),
          life: 1.5,
          maxLife: 1.5
        });
      }
    }

    if (isPlaying && ent.isMoving && Math.random() < frameRateIndependentEase(14, safeDt) && particles.length < 240) {
      if (ent.kind === 'air' && alt > 0.25) {
        particles.push({
          x: x - Math.cos(smoothAng) * (ent.radius * 0.85 * entScale),
          y: y - Math.sin(smoothAng) * (ent.radius * 0.85 * entScale),
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 0.75,
          maxLife: 0.75,
          radius: 2.5 * entScale,
          color: 0xe2e8f0
        });
      } else if (ent.domain !== 'air') {
        particles.push({
          x: x - Math.cos(smoothAng) * (ent.radius * 0.7 * entScale),
          y: y - Math.sin(smoothAng) * (ent.radius * 0.7 * entScale),
          vx: (Math.random() - 0.5) * 14 * entScale,
          vy: (Math.random() - 0.5) * 14 * entScale,
          life: 0.65,
          maxLife: 0.65,
          radius: (ent.domain === 'sea' ? 4.2 : 3) * entScale,
          color: ent.domain === 'sea' ? 0xbae6fd : 0xd6d3d1
        });
      }
    }

    const buildProg = Math.max(0, Math.min(1, lerp(ent.prevBuildProgress, ent.buildProgress, alpha)));
    view.sprite.alpha = buildProg < 1 ? 0.35 + buildProg * 0.65 : 1;
    view.buildArc.clear();
    if (buildProg < 1) {
      view.buildArc
        .arc(0, 0, ent.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * buildProg)
        .stroke({ width: 3, color: 0x38bdf8 });
    }
    view.ring.visible = !hideUIHelpers && selectedEntityId === ent.id;
  }

  // رسم موجات البحر المتوسعة (Kelvin V-wakes + تموج خفيف حول السفن)
  wakeGraphics.clear();
  for (let i = wakeRipples.length - 1; i >= 0; i--) {
    const w = wakeRipples[i];
    if (isPlaying) w.life -= safeDt;
    if (w.life <= 0) {
      wakeRipples.splice(i, 1);
      continue;
    }
    const p = 1 - w.life / w.maxLife;
    const spread = w.width * (0.6 + p * 1.9);
    const back = 12 * p;
    const cos = Math.cos(w.angle);
    const sin = Math.sin(w.angle);
    const perpX = -sin;
    const perpY = cos;
    const tipX = w.x - cos * back;
    const tipY = w.y - sin * back;
    const tailBack = back + 16 * (0.4 + p);
    const leftX = w.x - cos * tailBack + perpX * spread;
    const leftY = w.y - sin * tailBack + perpY * spread;
    const rightX = w.x - cos * tailBack - perpX * spread;
    const rightY = w.y - sin * tailBack - perpY * spread;
    const alphaW = (1 - p) * 0.55;
    wakeGraphics
      .moveTo(leftX, leftY)
      .lineTo(tipX, tipY)
      .lineTo(rightX, rightY)
      .stroke({ width: 2.2 * (1 - p * 0.4), color: 0xe0f2fe, alpha: alphaW });
  }
  for (const ent of engine.entities.values()) {
    if (ent.domain !== 'sea') continue;
    const sx = lerp(ent.prevX, ent.x, alpha);
    const sy = lerp(ent.prevY, ent.y, alpha);
    const wavePhase = (timeSec * 0.9 + (ent.x + ent.y) * 0.01) % 1;
    const rWave = ent.radius * (0.95 + wavePhase * 0.55) * lastUnitFactor * (ent.scaleMul ?? 1);
    wakeGraphics
      .circle(sx, sy, rWave)
      .stroke({ width: 1.5, color: 0x7dd3fc, alpha: (1 - wavePhase) * 0.35 });
  }

  // تحديث ورسم الجزيئات
  particleGraphics.clear();
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    if (isPlaying) {
      pt.x += pt.vx * safeDt;
      pt.y += pt.vy * safeDt;
      pt.life -= safeDt;
    }
    if (pt.life <= 0) {
      particles.splice(i, 1);
    } else {
      const ratio = pt.life / pt.maxLife;
      particleGraphics
        .circle(pt.x, pt.y, pt.radius * ratio)
        .fill({ color: pt.color, alpha: ratio * 0.55 });
    }
  }

  // تحديث البطاقات العائمة (Callouts)
  for (const [id, cv] of calloutViews) {
    if (!engine.callouts.has(id)) {
      calloutLayer.removeChild(cv.container);
      cv.container.destroy({ children: true });
      calloutViews.delete(id);
    }
  }
  const calloutScale = Math.max(0.42, Math.min(1.15, 1 / Math.pow(Math.max(0.25, camZoom), 0.78)));
  for (const c of engine.callouts.values()) {
    const targetEnt = engine.entities.get(c.target);
    const targetAnchor = engine.map.anchors[c.target];
    const tx = targetEnt ? lerp(targetEnt.prevX, targetEnt.x, alpha) : targetAnchor?.x;
    const entOffset = Math.max(10, 26 * lastUnitFactor * (targetEnt?.scaleMul ?? 1)) + 14 * calloutScale;
    const ty = targetEnt
      ? lerp(targetEnt.prevY, targetEnt.y, alpha) - entOffset
      : targetAnchor
        ? targetAnchor.y - 28 * calloutScale
        : undefined;
    if (tx === undefined || ty === undefined) continue;

    let cv = calloutViews.get(c.id);
    if (!cv) {
      const container = new Container();
      const bg = new Graphics();
      const label = new Text({
        text: c.text,
        style: {
          fontFamily: 'IBM Plex Sans Arabic, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: '600',
          fill: 0xf8fafc
        }
      });
      label.anchor.set(0.5);
      container.addChild(bg, label);
      calloutLayer.addChild(container);
      cv = { container, bg, label, lastText: '', lastColor: '' };
      calloutViews.set(c.id, cv);
    }
    if (cv.lastText !== c.text || cv.lastColor !== c.color) {
      cv.label.text = c.text;
      cv.lastText = c.text;
      cv.lastColor = c.color;
      const w = cv.label.width + 20;
      const h = 26;
      cv.bg
        .clear()
        .roundRect(-w / 2, -h / 2, w, h, 6)
        .fill({ color: 0x0f172a, alpha: 0.94 })
        .stroke({ width: 1.5, color: c.color });
    }
    cv.container.position.set(tx, ty);
    cv.container.rotation = -worldRotation;
    cv.container.scale.set(calloutScale, calloutScale * tiltCompY);
  }

  let nextSelPos = input.lastEmittedSelPos;
  if (onSelectedScreenPos) {
    const selEnt = selectedEntityId && !hideUIHelpers ? engine.entities.get(selectedEntityId) : undefined;
    if (selEnt) {
      const ex = lerp(selEnt.prevX, selEnt.x, alpha);
      const ey = lerp(selEnt.prevY, selEnt.y, alpha);
      const sp = worldToScreen({ x: ex, y: ey });
      const offsetPx = Math.max(20, selEnt.radius * lastUnitFactor * (selEnt.scaleMul ?? 1) * camZoom);
      if (
        !nextSelPos ||
        nextSelPos.id !== selEnt.id ||
        Math.abs(nextSelPos.x - sp.x) >= 1.5 ||
        Math.abs(nextSelPos.y - sp.y) >= 1.5
      ) {
        nextSelPos = { id: selEnt.id, x: sp.x, y: sp.y };
        onSelectedScreenPos({ id: selEnt.id, x: sp.x, y: sp.y, offsetPx });
      }
    } else if (nextSelPos !== null) {
      nextSelPos = null;
      onSelectedScreenPos(null);
    }
  }

  return { lastUnitFactor, lastEmittedSelPos: nextSelPos };
}
