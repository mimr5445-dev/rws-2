import { GeoProjection, geoPath } from 'd3-geo';

/**
 * جلد «لوح إحاطة المحيط الهادئ»: بحر أسود مطفي، زبد/ضباب أبيض على السواحل،
 * مناطق يابسة حمراء متوهجة، نقاط أهداف، خطوط مسافات بيضاء، وتسميات فرنسية متتبّعة.
 * يُرسم بالكامل على Canvas دون أصول خارجية، مع بذرة عشوائية ثابتة لضمان تكرار النتيجة.
 */

type Rng = () => number;
type Pt = { x: number; y: number };
type Segment = { x1: number; y1: number; x2: number; y2: number };

interface TrackedTextOptions {
  size: number;
  tracking: number;
  color: string;
  weight?: number;
  family?: string;
  align?: 'left' | 'center' | 'right';
  rotate?: number;
}

const RED_SOLID_ISO3 = new Set([
  'JPN', 'KOR', 'PRK', 'TWN', 'PHL', 'IDN', 'PNG', 'BRN', 'TLS', 'SGP'
]);
const RED_EDGE_ISO3 = new Set(['CHN', 'THA', 'VNM', 'MMR', 'MYS', 'KHM', 'LAO', 'RUS']);
const RED_ANY_ISO3 = new Set<string>([...RED_SOLID_ISO3, ...RED_EDGE_ISO3]);

function mulberry32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function collectCoastlineSegments(geometry: any, projection: GeoProjection, mapWidth: number): Segment[] {
  const segments: Segment[] = [];
  let rings: number[][][] = [];
  if (geometry?.type === 'Polygon') rings = [geometry.coordinates[0]];
  else if (geometry?.type === 'MultiPolygon') rings = geometry.coordinates.map((p: any) => p[0]);

  for (const ring of rings) {
    if (!ring) continue;
    let prev: Pt | null = null;
    for (const coord of ring) {
      const p = projection([coord[0], coord[1]]);
      if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
        prev = null;
        continue;
      }
      const pt: Pt = { x: p[0], y: p[1] };
      if (prev && Math.abs(pt.x - prev.x) <= mapWidth * 0.45) {
        segments.push({ x1: prev.x, y1: prev.y, x2: pt.x, y2: pt.y });
      }
      prev = pt;
    }
  }
  return segments;
}

function drawTrackedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: TrackedTextOptions): void {
  ctx.save();
  ctx.translate(x, y);
  if (o.rotate) ctx.rotate(o.rotate);
  ctx.font = `${o.weight ?? 500} ${o.size}px ${o.family ?? '"IBM Plex Mono", "Courier New", monospace'}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = o.color;
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + o.tracking * Math.max(0, chars.length - 1);
  let cx = o.align === 'center' ? -total / 2 : o.align === 'right' ? -total : 0;
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cx, 0);
    cx += widths[i] + o.tracking;
  }
  ctx.restore();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.16, -r * 0.16, r, 0);
  ctx.quadraticCurveTo(r * 0.16, r * 0.16, 0, r);
  ctx.quadraticCurveTo(-r * 0.16, r * 0.16, -r, 0);
  ctx.quadraticCurveTo(-r * 0.16, -r * 0.16, 0, -r);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.11, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

function drawCompassRose(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const len = i % 2 === 0 ? r : r * 0.58;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPuffCluster(
  ctx: CanvasRenderingContext2D,
  rand: Rng,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
  alpha: number,
  tint: string
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const x = cx + (rand() - 0.5) * rx * 2;
    const y = cy + (rand() - 0.5) * ry * 2;
    const r = 14 + rand() * 52;
    const a = alpha * (0.35 + rand() * 0.65);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${tint}, ${a})`);
    g.addColorStop(0.55, `rgba(${tint}, ${a * 0.35})`);
    g.addColorStop(1, `rgba(${tint}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGreatCircle(
  ctx: CanvasRenderingContext2D,
  a: Pt,
  b: Pt,
  bend: number
): { mid: Pt; angle: number } {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const cx = mx + nx * bend;
  const cy = my + ny * bend;

  ctx.save();
  ctx.strokeStyle = 'rgba(232, 238, 244, 0.66)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
  ctx.shadowBlur = 7;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo(cx, cy, b.x, b.y);
  ctx.stroke();
  ctx.restore();

  // علامات نهاية رفيعة
  ctx.save();
  ctx.strokeStyle = 'rgba(232, 238, 244, 0.55)';
  ctx.lineWidth = 1;
  for (const p of [a, b]) {
    ctx.beginPath();
    ctx.moveTo(p.x - nx * 7, p.y - ny * 7);
    ctx.lineTo(p.x + nx * 7, p.y + ny * 7);
    ctx.stroke();
  }
  ctx.restore();

  return {
    mid: { x: mx + nx * bend * 0.5, y: my + ny * bend * 0.5 },
    angle: Math.atan2(dy, dx)
  };
}

export interface PacificBriefingSkinInput {
  ctx: CanvasRenderingContext2D;
  projection: GeoProjection;
  countriesFc: GeoJSON.FeatureCollection;
  landGeom: any;
  borderMesh: any;
  featureIso3: Array<string | undefined>;
  width: number;
  height: number;
}

export function drawPacificBriefingSkin(input: PacificBriefingSkinInput): void {
  const { ctx, projection, countriesFc, landGeom, borderMesh, featureIso3, width, height } = input;
  const rand = mulberry32(0x19421207);
  const pathString = geoPath(projection);

  // 1) بحر أسود مطفي مع وهج مركزي خفيف جداً
  const ocean = ctx.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, '#0a0d0f');
  ocean.addColorStop(0.48, '#07090b');
  ocean.addColorStop(1, '#030405');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  const centerGlow = ctx.createRadialGradient(
    width * 0.5, height * 0.44, height * 0.04,
    width * 0.5, height * 0.5, width * 0.62
  );
  centerGlow.addColorStop(0, 'rgba(38, 44, 50, 0.30)');
  centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = centerGlow;
  ctx.fillRect(0, 0, width, height);

  // مسار اليابسة الموحّد (سواحل فقط بلا حدود سياسية داخلية) + مسارات الدول للمناطق الحمراء
  const landGeometry = (landGeom as any)?.geometry ?? landGeom;
  const landD = pathString(landGeom as any);
  const landPath = landD ? new Path2D(landD) : null;
  const paths: Array<{ path: Path2D; iso3: string | undefined; geometry: any }> = [];
  countriesFc.features.forEach((f, i) => {
    const d = pathString(f as any);
    if (!d) return;
    paths.push({ path: new Path2D(d), iso3: featureIso3[i], geometry: (f as any).geometry });
  });
  const borderD = pathString(borderMesh as any);
  const borderPath = borderD ? new Path2D(borderD) : null;

  // 2) اليابسة شبه السوداء (مع قصّ الحافة السفلية التي تغطيها الغيوم)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height * 0.88);
  ctx.clip();
  ctx.save();
  ctx.fillStyle = '#090b0d';
  if (landPath) ctx.fill(landPath);
  ctx.restore();

  // 3) زبد/رغوة ساحلية مضطربة: هالة ناعمة ثم خطوط متقطعة ثم رذاذ صغير
  if (landPath) {
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(228, 236, 244, 0.72)';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = 'rgba(215, 226, 236, 0.22)';
    ctx.lineWidth = 15;
    ctx.stroke(landPath);
    ctx.shadowBlur = 0;
    ctx.setLineDash([2, 4]);
    ctx.lineDashOffset = rand() * 20;
    ctx.strokeStyle = 'rgba(238, 244, 250, 0.58)';
    ctx.lineWidth = 2.8;
    ctx.stroke(landPath);
    ctx.setLineDash([1, 2.2]);
    ctx.lineDashOffset = rand() * 14;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.34)';
    ctx.lineWidth = 1;
    ctx.stroke(landPath);
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
    ctx.restore();
  }

  // رذاذ صغير على امتداد السواحل (من هندسة اليابسة الموحّدة)
  const allSegments: Segment[] = collectCoastlineSegments(landGeometry, projection, width);
  const redSegments: Segment[] = [];
  paths.forEach((p) => {
    if (p.iso3 && RED_ANY_ISO3.has(p.iso3)) {
      redSegments.push(...collectCoastlineSegments(p.geometry, projection, width));
    }
  });

  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < allSegments.length; i += 1) {
    const s = allSegments[i];
    if (rand() > 0.52) continue;
    const mx = (s.x1 + s.x2) / 2;
    const my = (s.y1 + s.y2) / 2;
    if (mx < -60 || mx > width + 60 || my < -60 || my > height + 60) continue;
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const off = (rand() - 0.5) * 11;
    const a = rand() * Math.PI * 2;
    const l = 2 + rand() * 8;
    const x = mx + nx * off;
    const y = my + ny * off;
    ctx.beginPath();
    ctx.moveTo(x - (Math.cos(a) * l) / 2, y - (Math.sin(a) * l) / 2);
    ctx.lineTo(x + (Math.cos(a) * l) / 2, y + (Math.sin(a) * l) / 2);
    ctx.strokeStyle = `rgba(242, 247, 252, ${0.18 + rand() * 0.62})`;
    ctx.lineWidth = 0.7 + rand() * 1.9;
    ctx.stroke();
    if (rand() > 0.58) {
      ctx.beginPath();
      ctx.arc(x + (rand() - 0.5) * 7, y + (rand() - 0.5) * 7, 0.7 + rand() * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(248, 251, 254, ${0.25 + rand() * 0.5})`;
      ctx.fill();
    }
  }
  ctx.restore();

  // زبد إضافي على الحافة القطبية العلوية
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 420; i++) {
    const x = rand() * width;
    const y = rand() * height * 0.11;
    const l = 2 + rand() * 9;
    const a = rand() * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x - (Math.cos(a) * l) / 2, y - (Math.sin(a) * l) / 2);
    ctx.lineTo(x + (Math.cos(a) * l) / 2, y + (Math.sin(a) * l) / 2);
    ctx.strokeStyle = `rgba(236, 243, 249, ${0.10 + rand() * 0.45})`;
    ctx.lineWidth = 0.7 + rand() * 1.6;
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore(); // إنهاء قصّ الحافة السفلية

  // حدود الدول: خفيفة جداً حتى لا تطفو فوق النمط الحربي
  if (borderPath) {
    ctx.save();
    ctx.strokeStyle = 'rgba(150, 160, 170, 0.09)';
    ctx.lineWidth = 0.7;
    ctx.stroke(borderPath);
    ctx.restore();
  }

  // 4) ضباب/غيوم بيضاء-رمادية على الأطراف وفي الأسفل
  drawPuffCluster(ctx, rand, width * 0.36, height * 0.90, 250, 82, 58, 0.36, '240, 245, 250');
  drawPuffCluster(ctx, rand, width * 0.52, height * 0.93, 280, 92, 64, 0.40, '246, 250, 253');
  drawPuffCluster(ctx, rand, width * 0.69, height * 0.88, 235, 78, 54, 0.34, '236, 243, 249');
  drawPuffCluster(ctx, rand, width * 0.85, height * 0.91, 205, 70, 42, 0.30, '240, 246, 251');
  drawPuffCluster(ctx, rand, width * 0.17, height * 0.93, 165, 66, 30, 0.22, '224, 233, 241');
  drawPuffCluster(ctx, rand, width * 0.43, height * 0.03, 205, 66, 38, 0.20, '232, 239, 246');
  drawPuffCluster(ctx, rand, width * 0.72, height * 0.05, 185, 60, 32, 0.18, '226, 234, 242');
  drawPuffCluster(ctx, rand, width * 0.06, height * 0.26, 125, 145, 28, 0.13, '214, 224, 233');
  drawPuffCluster(ctx, rand, width * 0.95, height * 0.24, 125, 145, 28, 0.13, '214, 224, 233');

  // 5) المناطق الحمراء المتوهجة ونقاط الجبهة
  ctx.save();
  for (const p of paths) {
    if (!p.iso3 || !RED_SOLID_ISO3.has(p.iso3)) continue;
    ctx.shadowColor = 'rgba(255, 42, 24, 0.9)';
    ctx.shadowBlur = 26;
    ctx.fillStyle = 'rgba(158, 22, 14, 0.38)';
    ctx.fill(p.path);
    ctx.shadowBlur = 0;

    // تنقيش داكن فوق المنطقة الحمراء حتى تبدو كجبهة متوهجة لا كتلة صمّاء
    ctx.save();
    ctx.clip(p.path);
    for (let j = 0; j < 46; j++) {
      const x = rand() * width * 0.56;
      const y = rand() * height * 0.78;
      const r = 16 + rand() * 76;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(4, 5, 6, ${0.32 + rand() * 0.34})`);
      g.addColorStop(1, 'rgba(4, 5, 6, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.shadowColor = 'rgba(255, 56, 32, 0.95)';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = 'rgba(255, 86, 56, 0.92)';
    ctx.lineWidth = 2.7;
    ctx.stroke(p.path);
    ctx.shadowBlur = 0;
  }
  for (const p of paths) {
    if (!p.iso3 || !RED_EDGE_ISO3.has(p.iso3)) continue;
    ctx.shadowColor = 'rgba(255, 42, 24, 0.9)';
    ctx.shadowBlur = 26;
    ctx.strokeStyle = 'rgba(255, 48, 28, 0.20)';
    ctx.lineWidth = 9;
    ctx.stroke(p.path);
    ctx.shadowBlur = 16;
    ctx.setLineDash([3, 8]);
    ctx.lineDashOffset = rand() * 12;
    ctx.strokeStyle = 'rgba(255, 78, 48, 0.88)';
    ctx.lineWidth = 2.8;
    ctx.stroke(p.path);
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;
  }
  ctx.restore();

  // إعادة رغوة بيضاء خفيفة فوق سواحل المناطق الحمراء
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < redSegments.length; i += 1) {
    if (rand() > 0.42) continue;
    const s = redSegments[i];
    const mx = (s.x1 + s.x2) / 2;
    const my = (s.y1 + s.y2) / 2;
    if (mx < -40 || mx > width + 40 || my < -40 || my > height + 40) continue;
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const off = (rand() - 0.5) * 9;
    const a = rand() * Math.PI * 2;
    const l = 2 + rand() * 7;
    const x = mx + nx * off;
    const y = my + ny * off;
    ctx.beginPath();
    ctx.moveTo(x - (Math.cos(a) * l) / 2, y - (Math.sin(a) * l) / 2);
    ctx.lineTo(x + (Math.cos(a) * l) / 2, y + (Math.sin(a) * l) / 2);
    ctx.strokeStyle = `rgba(246, 249, 252, ${0.22 + rand() * 0.55})`;
    ctx.lineWidth = 0.7 + rand() * 1.6;
    ctx.stroke();
  }
  ctx.restore();

  // خط جبهة أحمر متقطع على امتداد جزر شرق آسيا
  const frontLl: Array<[number, number]> = [
    [146, 45], [142, 40], [138, 35], [132, 31], [127, 25], [123, 19],
    [121, 13], [119, 7], [116, 2], [110, -1], [105, -3], [100, -1], [96, 3]
  ];
  const frontPts = frontLl.map((ll) => projection(ll)).filter(Boolean) as Array<[number, number]>;
  if (frontPts.length > 1) {
    ctx.save();
    ctx.shadowColor = 'rgba(255, 45, 25, 0.9)';
    ctx.shadowBlur = 12;
    ctx.setLineDash([2, 9]);
    ctx.strokeStyle = 'rgba(255, 58, 36, 0.78)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(frontPts[0][0], frontPts[0][1]);
    for (let i = 1; i < frontPts.length; i++) ctx.lineTo(frontPts[i][0], frontPts[i][1]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // نقاط حمراء صغيرة على الساحل المُبرَز وفي وسط المحيط
  ctx.save();
  ctx.shadowColor = 'rgba(255, 48, 28, 0.95)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(255, 70, 45, 0.92)';
  for (let i = 0; i < redSegments.length; i += 3) {
    if (rand() > 0.84) continue;
    const s = redSegments[i];
    const x = (s.x1 + s.x2) / 2 + (rand() - 0.5) * 7;
    const y = (s.y1 + s.y2) / 2 + (rand() - 0.5) * 7;
    ctx.beginPath();
    ctx.arc(x, y, 1.4 + rand() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const islandLl: Array<[number, number]> = [
    [142, 27], [145, 16], [140, 7], [170, 8], [-172, -3],
    [-172, -14], [-150, -17], [-157.8, 21.3], [165, -10], [-160, 10]
  ];
  for (const ll of islandLl) {
    const p = projection(ll);
    if (!p) continue;
    ctx.beginPath();
    ctx.arc(p[0], p[1], 2.6 + rand() * 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 12; i++) {
    const x = width * (0.30 + rand() * 0.48);
    const y = height * (0.32 + rand() * 0.42);
    ctx.beginPath();
    ctx.arc(x, y, 1 + rand() * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 66, 42, ${0.45 + rand() * 0.4})`;
    ctx.fill();
  }
  ctx.restore();

  // 6) خطوط المسافات البيضاء ونجوم/بوصلة
  const japanStar: Pt = { x: width * 0.285, y: height * 0.245 };
  const hawaiiPoint: Pt = { x: width * 0.55, y: height * 0.49 };
  const usStar: Pt = { x: width * 0.82, y: height * 0.40 };
  const leg1 = drawGreatCircle(ctx, japanStar, hawaiiPoint, 26);
  const leg2 = drawGreatCircle(ctx, hawaiiPoint, usStar, -20);

  // نقاط صغيرة على الخطوط
  ctx.save();
  ctx.fillStyle = 'rgba(236, 242, 247, 0.75)';
  for (const leg of [leg1, leg2]) {
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.arc(
        leg.mid.x + (rand() - 0.5) * 4,
        leg.mid.y + (rand() - 0.5) * 4,
        1.3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
  ctx.restore();

  // 7) تعتيم الأطراف ( vignette )
  const vignette = ctx.createRadialGradient(
    width * 0.5, height * 0.48, height * 0.22,
    width * 0.5, height * 0.5, width * 0.72
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(0.68, 'rgba(0, 0, 0, 0.18)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.62)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // 8) النجوم والبوصلة
  drawSparkle(ctx, japanStar.x, japanStar.y, 22, 'rgba(242, 246, 250, 0.95)');
  drawSparkle(ctx, usStar.x, usStar.y, 22, 'rgba(242, 246, 250, 0.95)');
  drawCompassRose(ctx, width * 0.575, height * 0.705, 20, 'rgba(226, 233, 240, 0.72)');

  // 9) التسميات الفرنسية المتتبّعة + مسافات الخطوط
  const labelColor = 'rgba(214, 222, 230, 0.66)';
  const brightColor = 'rgba(238, 243, 248, 0.92)';
  const countryLabels: Array<{ text: string; x: number; y: number; size: number; tracking: number; color?: string; rotate?: number; align?: 'left' | 'center' | 'right' }> = [
    { text: 'RUSSIE', x: 0.075, y: 0.045, size: 20, tracking: 5, rotate: -0.12 },
    { text: 'SIBERIE', x: 0.035, y: 0.155, size: 18, tracking: 4, rotate: -0.18 },
    { text: 'CHINE', x: 0.045, y: 0.305, size: 18, tracking: 4 },
    { text: 'COREE', x: 0.175, y: 0.265, size: 16, tracking: 3.5 },
    { text: 'JAPON', x: 0.268, y: 0.292, size: 28, tracking: 7, color: brightColor },
    { text: 'ETATS-UNIS', x: 0.802, y: 0.468, size: 28, tracking: 7, color: brightColor },
    { text: 'OCEAN PACIFIQUE', x: 0.485, y: 0.655, size: 34, tracking: 14, color: 'rgba(220, 228, 236, 0.74)', align: 'center' },
    { text: 'ILES HAWAI', x: 0.545, y: 0.555, size: 18, tracking: 5 },
    { text: 'ILES MARSHALL', x: 0.415, y: 0.635, size: 15, tracking: 3.5 },
    { text: 'ILES CAROLINES', x: 0.225, y: 0.665, size: 15, tracking: 3.5 },
    { text: 'ILES MARIANNES', x: 0.275, y: 0.475, size: 15, tracking: 3.5 },
    { text: 'ILES BONIN', x: 0.302, y: 0.345, size: 15, tracking: 3.5 },
    { text: 'ILES PHOENIX', x: 0.49, y: 0.615, size: 15, tracking: 3.5 },
    { text: 'ILES SAMOA', x: 0.47, y: 0.79, size: 15, tracking: 3.5 },
    { text: 'ILES SOCIETE', x: 0.60, y: 0.80, size: 15, tracking: 3.5 },
    { text: 'ALASKA', x: 0.885, y: 0.10, size: 18, tracking: 4 }
  ];
  for (const l of countryLabels) {
    drawTrackedText(ctx, l.text, l.x * width, l.y * height, {
      size: l.size,
      tracking: l.tracking,
      color: l.color ?? labelColor,
      weight: l.size >= 24 ? 600 : 500,
      align: l.align,
      rotate: l.rotate
    });
  }

  drawTrackedText(ctx, '6000 KMS', leg1.mid.x, leg1.mid.y - 20, {
    size: 24,
    tracking: 6,
    color: 'rgba(236, 242, 247, 0.92)',
    weight: 600,
    align: 'center',
    rotate: leg1.angle
  });
  drawTrackedText(ctx, '3800 KMS', leg2.mid.x, leg2.mid.y - 20, {
    size: 24,
    tracking: 6,
    color: 'rgba(236, 242, 247, 0.92)',
    weight: 600,
    align: 'center',
    rotate: leg2.angle
  });

  // 10) حبيبات فيلم خفيفة
  ctx.save();
  for (let i = 0; i < 2600; i++) {
    const x = rand() * width;
    const y = rand() * height;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.008 + rand() * 0.03})`;
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.restore();
}
