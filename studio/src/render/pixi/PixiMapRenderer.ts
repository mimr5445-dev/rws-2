import { Application, Container, Graphics } from 'pixi.js';
import { fitWorld, type Camera, type Viewport } from '@/core/camera';
import { WORLD_HEIGHT, WORLD_WIDTH, type PolygonalCountry } from '@/core/geo';
import { EXPORT_HIDDEN_LAYERS, LAYER_ORDER, type LayerName } from '../layers';
import { buildRenderPlan } from '../plan';

const COLORS = {
  background: 0x050a14,
  ocean: 0x0b1a2b,
  land: 0x1b2b45,
  landStroke: 0x3f5f8a,
  selectedFill: 0x3ba3ff,
  selectedStroke: 0x9fd0ff,
  graticule: 0x1a2a44,
};

const GRATICULE_STEP_LON = 15;
const GRATICULE_STEP_LAT = 15;

/**
 * طبقة العرض (S2.4): تبني شجرة الطبقات مرة واحدة وتقرأ الحالة فقط.
 * لا تعرف النموذج ولا تعدّله؛ كل مدخلاتها كائنات للقراءة.
 */
export class PixiMapRenderer {
  private readonly app: Application;
  private readonly layers = new Map<LayerName, Container>();
  private readonly world = new Container();
  private readonly ocean = new Graphics();
  private readonly land = new Graphics();
  private borders = new Graphics();
  private readonly selection = new Graphics();
  private readonly countries: readonly PolygonalCountry[];
  private viewport: Viewport = { width: 1, height: 1 };
  private camera: Camera = fitWorld({ width: 1, height: 1 });
  private selectedCountryId: string | null = null;
  private borderRebuildZoom = 0;
  private destroyed = false;

  private constructor(app: Application, countries: readonly PolygonalCountry[]) {
    this.app = app;
    this.countries = countries;
  }

  static async create(
    host: HTMLElement,
    countries: readonly PolygonalCountry[],
  ): Promise<PixiMapRenderer> {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const app = new Application();
    await app.init({
      width,
      height,
      background: COLORS.background,
      antialias: true,
      resolution: Math.min(globalThis.devicePixelRatio ?? 1, 2),
      autoDensity: true,
      preference: 'webgl',
      powerPreference: 'high-performance',
      // خريطة ساكنة: نرسم عند تغيّر الحالة فقط، لا ستين مرة في الثانية بلا سبب.
      autoStart: false,
    });

    const renderer = new PixiMapRenderer(app, countries);
    host.appendChild(app.canvas);
    app.canvas.style.display = 'block';
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
    app.canvas.setAttribute('aria-hidden', 'true');
    renderer.build();
    renderer.resize(width, height);
    app.render();
    return renderer;
  }

  private build(): void {
    LAYER_ORDER.forEach((name) => {
      const container = new Container();
      container.label = name;
      container.visible = !EXPORT_HIDDEN_LAYERS.includes(name);
      this.layers.set(name, container);
      if (name === 'map') container.addChild(this.world);
      this.app.stage.addChild(container);
    });

    this.world.addChild(this.ocean);
    this.world.addChild(this.land);
    this.world.addChild(this.borders);
    this.world.addChild(this.selection);

    this.drawOcean();
    this.drawLand();
    this.drawGraticule();
    this.rebuildBorders(this.camera.zoom);
  }

  private drawOcean(): void {
    this.ocean.rect(0, 0, WORLD_WIDTH, WORLD_HEIGHT).fill({ color: COLORS.ocean, alpha: 1 });
  }

  private drawGraticule(): void {
    const graticule = new Graphics();
    const width = WORLD_WIDTH;
    const height = WORLD_HEIGHT;
    for (let lon = -180; lon <= 180; lon += GRATICULE_STEP_LON) {
      const x = ((lon + 180) / 360) * width;
      graticule.moveTo(x, 0).lineTo(x, height);
    }
    for (let lat = -75; lat <= 75; lat += GRATICULE_STEP_LAT) {
      const y = ((90 - lat) / 180) * height;
      graticule.moveTo(0, y).lineTo(width, y);
    }
    graticule.stroke({ width: 2, color: COLORS.graticule, alpha: 0.55 });
    this.world.addChildAt(graticule, 1);
  }

  private drawLand(): void {
    for (const country of this.countries) {
      for (const ring of country.rings) {
        const points = new Array<number>(ring.length * 2);
        for (let index = 0; index < ring.length; index += 1) {
          points[index * 2] = country.points[(ring.start + index) * 2] ?? 0;
          points[index * 2 + 1] = country.points[(ring.start + index) * 2 + 1] ?? 0;
        }
        this.land.poly(points, true);
      }
    }
    this.land.fill({ color: COLORS.land, alpha: 1 });
  }

  /** الحدود تُبنى بسماكة تعويض الزوم، وتُعاد عند تغيّر ملموس فقط (تكلفة محسوبة). */
  private rebuildBorders(zoom: number): void {
    if (zoom > 0 && this.borderRebuildZoom > 0) {
      const ratio = zoom / this.borderRebuildZoom;
      if (ratio > 0.89 && ratio < 1.12) return;
    }
    this.borderRebuildZoom = zoom;
    const width = Math.min(6, Math.max(0.9, 1.1 / Math.max(zoom, 0.05)));
    const next = new Graphics();
    for (const country of this.countries) {
      for (const ring of country.rings) {
        if (ring.hole) continue;
        const points = new Array<number>(ring.length * 2);
        for (let index = 0; index < ring.length; index += 1) {
          points[index * 2] = country.points[(ring.start + index) * 2] ?? 0;
          points[index * 2 + 1] = country.points[(ring.start + index) * 2 + 1] ?? 0;
        }
        next.poly(points, true);
      }
    }
    next.stroke({ width, color: COLORS.landStroke, alpha: 0.75 });

    const index = this.world.getChildIndex(this.borders);
    this.world.removeChildAt(index);
    this.borders.destroy();
    this.world.addChildAt(next, index);
    this.borders = next;
  }

  private drawSelection(): void {
    this.selection.clear();
    if (!this.selectedCountryId) return;
    const country = this.countries.find((item) => item.id === this.selectedCountryId);
    if (!country) return;
    const width = Math.min(8, Math.max(1.4, 2 / Math.max(this.camera.zoom, 0.05)));
    for (const ring of country.rings) {
      const points = new Array<number>(ring.length * 2);
      for (let index = 0; index < ring.length; index += 1) {
        points[index * 2] = country.points[(ring.start + index) * 2] ?? 0;
        points[index * 2 + 1] = country.points[(ring.start + index) * 2 + 1] ?? 0;
      }
      this.selection.poly(points, true);
    }
    this.selection.fill({ color: COLORS.selectedFill, alpha: 0.28 });
    this.selection.stroke({ width, color: COLORS.selectedStroke, alpha: 0.9 });
  }

  resize(width: number, height: number): void {
    this.viewport = { width: Math.max(1, width), height: Math.max(1, height) };
    this.app.renderer.resize(this.viewport.width, this.viewport.height);
    this.update(this.camera, this.selectedCountryId);
  }

  /** يطبّق خطة الرسم النقية على شجرة المشاهد. */
  update(camera: Camera, selectedCountryId: string | null): void {
    if (this.destroyed) return;
    this.camera = camera;
    this.selectedCountryId = selectedCountryId;

    const plan = buildRenderPlan(
      { countries: this.countries, selectedCountryId },
      camera,
      this.viewport,
    );

    this.world.scale.set(plan.transform.scale);
    this.world.position.set(plan.transform.offsetX, plan.transform.offsetY);
    this.rebuildBorders(camera.zoom);
    this.drawSelection();
    this.app.render();
  }

  get stats(): { layers: number; countries: number } {
    return { layers: this.layers.size, countries: this.countries.length };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.app.destroy(true, { children: true, texture: true });
  }
}
