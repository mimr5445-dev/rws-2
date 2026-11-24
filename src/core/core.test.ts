import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as yaml from 'js-yaml';
import { findPath, isWalkable } from '../engine/pathfinding';
import { formatYamlSyntaxErrorAr, validateScenario } from '../validation/validator';
import { DT, StudioEngine, TICK_RATE } from '../engine/engine';
import { buildAiScenarioPrompt, generateCatalogMarkdown } from './catalog';
import { MapPack, NavCell, ScenarioFile } from './types';
import { DEMO_ACTORS, DEMO_MAPS } from '../packs/demoPacks';
import { PackRegistry } from '../packs/packRegistry';

test('A* sea pathfinding in geopolitics_strait never crosses land cells', () => {
  const map = DEMO_MAPS.geopolitics_strait;
  const from = map.anchors.port_south;
  const to = map.anchors.port_east;
  const path = findPath(map, from, to, 'sea');

  assert.ok(path.length >= 2, 'smoothed sea path should bend cleanly around peninsula');
  let prev = from;
  for (const pt of path) {
    for (let s = 0; s <= 10; s++) {
      const x = prev.x + ((pt.x - prev.x) * s) / 10;
      const y = prev.y + ((pt.y - prev.y) * s) / 10;
      const gx = Math.floor(x / map.cellSize);
      const gy = Math.floor(y / map.cellSize);
      const cell = map.navGrid[gy * map.cols + gx];
      assert.equal(isWalkable(cell, 'sea'), true, `segment pt (${x}, ${y}) stepped onto non-sea cell ${cell}`);
    }
    prev = pt;
  }
});

test('A* land pathfinding in tactical_valley crosses river via the bridge and avoids mountain', () => {
  const map = DEMO_MAPS.tactical_valley;
  const from = map.anchors.base_blue;
  const to = map.anchors.hill_east;
  const path = findPath(map, from, to, 'land');

  assert.ok(path.length >= 2, 'smoothed land path should bend through the bridge');
  let crossedBridge = false;
  let prev = from;
  for (const pt of path) {
    for (let s = 0; s <= 12; s++) {
      const x = prev.x + ((pt.x - prev.x) * s) / 12;
      const y = prev.y + ((pt.y - prev.y) * s) / 12;
      const gx = Math.floor(x / map.cellSize);
      const gy = Math.floor(y / map.cellSize);
      const cell = map.navGrid[gy * map.cols + gx];
      assert.equal(cell, 0, `land unit stepped on invalid cell ${cell} at (${x}, ${y})`);
      if (x >= 540 && x <= 640 && y >= 350 && y <= 430) {
        crossedBridge = true;
      }
    }
    prev = pt;
  }
  assert.equal(crossedBridge, true, 'land unit must cross the river through the bridge');
});

test('Scenario validator catches typos and validates v0.2 callout, pulse, and remove', () => {
  const straitRaw = fs.readFileSync('src/scenarios/strait_crisis.scenario.yaml', 'utf8');
  const straitParsed = yaml.load(straitRaw) as ScenarioFile;
  assert.deepEqual(validateScenario(straitParsed, DEMO_MAPS[straitParsed.meta.map], DEMO_ACTORS), []);

  const valleyRaw = fs.readFileSync('src/scenarios/valley_advance.scenario.yaml', 'utf8');
  const valleyParsed = yaml.load(valleyRaw) as ScenarioFile;
  assert.deepEqual(validateScenario(valleyParsed, DEMO_MAPS[valleyParsed.meta.map], DEMO_ACTORS), []);

  const broken: ScenarioFile = {
    meta: { title: 'broken', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [{ id: 'ship1', actor: 'naval_corvette', at: 'port_sout' }],
        pulse: { at: 'strait_gat' }
      },
      {
        at: '1s',
        move: { entity: 'missing_ship', to: 'strait_gate' },
        callout: { id: 'c1', target: 'unknown_target', text: 'bad' },
        remove: { entity: 'ghost_unit' }
      }
    ]
  };
  const issues = validateScenario(broken, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS);
  assert.equal(issues.length, 5);
  assert.ok(issues[0].message.includes('port_south'), 'should suggest closest anchor port_south');
  assert.ok(issues[1].message.includes('strait_gate'), 'should suggest closest anchor for pulse.at');
  assert.equal(issues[2].field, 'move.entity');
  assert.equal(issues[3].field, 'remove.entity');
  assert.equal(issues[4].field, 'callout.target');
});

test('StudioEngine deterministic seekToTick, callouts, pulses, and remove work accurately', () => {
  const scenario: ScenarioFile = {
    meta: { title: 'v0.2 test', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [{ id: 'patrol_1', actor: 'naval_corvette', at: 'port_south', faction: 'blue' }],
        callout: { id: 'c_temp', target: 'patrol_1', text: 'مهمة', duration: '2s' }
      },
      {
        at: '1s',
        pulse: { at: 'strait_gate', color: '#ef4444', radius: 90 }
      },
      {
        at: '4s',
        remove: { entity: 'patrol_1' }
      }
    ]
  };

  const engine = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, scenario);
  const sounds: string[] = [];
  engine.onSound((s) => sounds.push(s));

  // Scrub forward to 1.2s silently
  const t12 = Math.round(1.2 * TICK_RATE);
  engine.seekToTick(t12);
  assert.equal(engine.tick, t12);
  assert.equal(sounds.length, 0, 'seekToTick must be silent');
  assert.ok(engine.entities.has('patrol_1'));
  assert.ok(engine.callouts.has('c_temp'));
  assert.equal(engine.pulses.length, 1, 'pulse should be active at 1.2s');

  // Scrub forward to 4.5s -> callout expired, patrol_1 removed
  engine.seekToTick(Math.round(4.5 * TICK_RATE));
  assert.equal(engine.callouts.has('c_temp'), false, 'timed callout should expire after 2s');
  assert.equal(engine.entities.has('patrol_1'), false, 'patrol_1 should be removed at 4s');

  // Scrub backward to 0.5s -> patrol_1 and c_temp restored deterministically
  const t05 = Math.round(0.5 * TICK_RATE);
  engine.seekToTick(t05);
  assert.equal(engine.tick, t05);
  assert.ok(engine.entities.has('patrol_1'));
  assert.ok(engine.callouts.has('c_temp'));
});

test('PackRegistry loads studio actors, inherits templates, and keeps world-only map registry', async () => {
  const reg = new PackRegistry(false);
  await reg.saveCustomActor({
    id: 'cargo_truck',
    label: 'شاحنة إمداد',
    extends: '_vehicle',
    svg: '<svg viewBox="0 0 64 64"><rect width="64" height="64"/></svg>'
  });
  const truck = reg.actors.cargo_truck;
  assert.ok(truck);
  assert.equal(truck.domain, 'land');
  assert.equal(truck.kind, 'vehicle');
  assert.equal(truck.speed, 94);

  const politicalBoard = reg.maps.world_political_board;
  assert.ok(politicalBoard, 'the provided political world map is registered as a selectable board');
  assert.equal(politicalBoard.svgOrUrl, '/maps/world-political-board.jpg');
  assert.equal(politicalBoard.navGrid.length, politicalBoard.cols * politicalBoard.rows);

  const bundle = reg.exportCurrentBundle();
  assert.equal(bundle.maps?.length ?? 0, 0, 'built-in maps are not included in custom pack exports');
  assert.ok((bundle.actors?.length ?? 0) >= 25);
  assert.ok(reg.actors.mbt_tank?.ability?.mode === 'shell');
  assert.ok(reg.actors.ballistic_tel?.ability?.mode === 'missile');
  assert.ok(reg.actors.infantry_squad?.ability?.mode === 'bullet');

  const md = generateCatalogMarkdown(reg.maps, reg.actors);
  assert.ok(md.includes('cargo_truck'));
  assert.ok(md.includes('f35_stealth'));

  const prompt = buildAiScenarioPrompt(reg.maps, reg.actors, 'حصار بحري');
  assert.ok(prompt.includes('حصار بحري'));
  assert.ok(prompt.includes('callout'));
  assert.ok(prompt.includes('pulse'));
});

test('MinHeap A* blocks land units across sea and emits onMoveBlocked while supporting canal/bridge cell 3', () => {
  // 10x5 grid: left continent (cols 0..2), ocean (cols 3..6), right continent (cols 7..9)
  const cols = 10;
  const rows = 5;
  const cellSize = 20;
  const navGrid: Array<0 | 1 | 2 | 3> = new Array(cols * rows).fill(1);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x <= 2; x++) navGrid[y * cols + x] = 0;
    for (let x = 7; x < cols; x++) navGrid[y * cols + x] = 0;
  }

  const splitMap = {
    id: 'split_continents',
    title: 'Split Continents',
    kind: 'geopolitical' as const,
    width: cols * cellSize,
    height: rows * cellSize,
    cellSize,
    cols,
    rows,
    navGrid,
    svgOrUrl: '',
    anchors: {
      west_land: { x: 20, y: 50 },
      east_land: { x: 170, y: 50 },
      mid_ocean: { x: 100, y: 50 }
    },
    zones: {}
  };

  // Tank cannot cross mid_ocean or reach east_land across sea
  assert.deepEqual(findPath(splitMap, splitMap.anchors.west_land, splitMap.anchors.east_land, 'land'), []);
  assert.deepEqual(findPath(splitMap, splitMap.anchors.west_land, splitMap.anchors.mid_ocean, 'land'), []);

  // Engine triggers onMoveBlocked when tank receives unreachable ocean/island order
  const engine = new StudioEngine(splitMap, DEMO_ACTORS, {
    meta: { title: 'blocked test', map: 'split_continents' },
    timeline: [{ at: '0s', spawn: [{ id: 't1', actor: 'heavy_tank', at: 'west_land' }] }]
  });
  let blockedCount = 0;
  engine.onMoveBlocked(() => {
    blockedCount++;
  });
  engine.dispatchOrder({ type: 'move', entityId: 't1', to: splitMap.anchors.east_land });
  engine.flushOrders();
  assert.equal(blockedCount, 1, 'engine should emit onMoveBlocked for disconnected land destination');

  // Verify NavCell = 3 allows both land and sea traversal when connected
  navGrid[2 * cols + 3] = 3;
  navGrid[2 * cols + 4] = 3;
  navGrid[2 * cols + 5] = 3;
  navGrid[2 * cols + 6] = 3;
  const canalLandPath = findPath(splitMap, splitMap.anchors.west_land, splitMap.anchors.east_land, 'land');
  assert.ok(canalLandPath.length > 0, 'land unit should cross via canal/bridge cells (3)');
  assert.equal(isWalkable(3, 'sea'), true, 'sea unit should also traverse canal cell (3)');
});

test('rewindGeoJsonForD3 converts RFC 7946 CCW province polygons to D3 spherical CW winding', async () => {
  const { geoArea, geoCentroid } = await import('d3-geo');
  const { rewindGeoJsonForD3 } = await import('../maps/worldGeoEngine');
  const ccwFc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { shapeName: 'Riyadh' },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [44, 23],
              [46, 23],
              [46, 25],
              [44, 25],
              [44, 23]
            ]
          ]
        }
      }
    ]
  };
  assert.ok(geoArea(ccwFc) > 2 * Math.PI, 'raw RFC 7946 CCW square appears inverted to d3-geo');
  const rewound = rewindGeoJsonForD3(ccwFc);
  assert.ok(geoArea(rewound) < 0.01, 'rewound square has true small spherical area');
  const [lon, lat] = geoCentroid(rewound);
  assert.ok(Math.abs(lon - 45) < 0.5 && Math.abs(lat - 24) < 0.5, `centroid (${lon}, ${lat}) should stay inside box`);
});

test('ActionRecorder generates valid YAML with free PointRef coordinates that replays in StudioEngine', async () => {
  const { ActionRecorder } = await import('./actionRecorder');
  const map = DEMO_MAPS.tactical_valley;
  const recorder = new ActionRecorder();
  recorder.start(map.id, { x: 600, y: 400, zoom: 1.0 });
  recorder.recordSpawn('sb_1', 'heavy_tank', { x: 180, y: 400 }, 'blue');
  recorder.recordMove('sb_1', { x: 450, y: 230 });
  recorder.recordConstruct('sb_2', 'radar_outpost', { x: 240, y: 300 }, 'blue', 1.8);
  recorder.recordZone('east_sector', '#ef4444', 0.38);
  recorder.recordArrow('arr_1', { x: 180, y: 400 }, { x: 590, y: 390 });
  recorder.recordPulse({ x: 590, y: 390 });
  recorder.recordCaption('تجربة مسجلة');
  recorder.stop();

  const generatedYaml = recorder.toYaml('عرض تجريبي مسجل');
  const parsed = yaml.load(generatedYaml) as ScenarioFile;
  assert.deepEqual(validateScenario(parsed, map, DEMO_ACTORS), [], 'recorded YAML should pass validation cleanly');

  const replay = new StudioEngine(map, DEMO_ACTORS, parsed);
  replay.seekToTick(Math.round(3 * TICK_RATE));
  assert.ok(replay.entities.has('sb_1'), 'recorded spawned tank exists during replay');
  assert.ok(replay.entities.has('sb_2'), 'recorded constructed building exists during replay');
  assert.ok(replay.arrows.has('arr_1'), 'recorded arrow exists during replay');
  assert.equal(replay.caption, 'تجربة مسجلة');
});

test('rehydrateMapPack restores hitTest polygon picking after IndexedDB serialization', async () => {
  const { rehydrateMapPack } = await import('../storage/studioDb');
  const baseMap = {
    ...DEMO_MAPS.tactical_valley,
    hitTest: undefined,
    regions: {
      zone_a: {
        id: 'zone_a',
        name: 'Zone A',
        center: { x: 150, y: 150 },
        bounds: { minX: 100, minY: 100, maxX: 200, maxY: 200 },
        polygons: [
          [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 200, y: 200 },
            { x: 100, y: 200 }
          ]
        ]
      }
    }
  };
  const rehydrated = rehydrateMapPack(baseMap);
  assert.equal(typeof rehydrated.hitTest, 'function');
  assert.equal(rehydrated.hitTest?.({ x: 150, y: 150 }), 'zone_a');
  assert.equal(rehydrated.hitTest?.({ x: 50, y: 50 }), null);
});

test('validateScenario guards malformed timelines, invalid sound/faction/after, and engine honors duration_hint', () => {
  const badTimeline = { meta: { title: 'bad', map: 'tactical_valley' }, timeline: 'oops' } as unknown as ScenarioFile;
  const tlIssues = validateScenario(badTimeline, DEMO_MAPS.tactical_valley, DEMO_ACTORS);
  assert.equal(tlIssues[0]?.field, 'timeline');

  const nullStep = {
    meta: { title: 'bad2', map: 'tactical_valley' },
    timeline: [
      null,
      { at: '0s', sound: 'bad_sfx', spawn: [{ id: 'u1', actor: 'heavy_tank', at: 'base_blue', faction: 'green' }] },
      { after: 'ghost.arrived', caption: { text: 'bad' } }
    ]
  } as unknown as ScenarioFile;
  const issues = validateScenario(nullStep, DEMO_MAPS.tactical_valley, DEMO_ACTORS);
  assert.ok(issues.some((i) => i.field === 'step'));
  assert.ok(issues.some((i) => i.field === 'sound'));
  assert.ok(issues.some((i) => i.field === 'spawn.faction'));
  assert.ok(issues.some((i) => i.field === 'after'));

  const hinted = new StudioEngine(DEMO_MAPS.tactical_valley, DEMO_ACTORS, {
    meta: { title: 'hinted', map: 'tactical_valley', duration_hint: '42s' },
    timeline: [
      {
        at: '0s',
        spawn: [{ id: 'u1', actor: 'heavy_tank', at: 'base_blue', faction: 'blue' }],
        callout: { id: 'c_perm', target: 'u1', text: 'باقية حتى الحذف' }
      },
      { at: '1s', remove: { entity: 'u1' } }
    ]
  });
  assert.equal(hinted.estimateDurationSec(), 42);
  hinted.seekToTick(Math.round(1.35 * TICK_RATE));
  assert.equal(hinted.callouts.has('c_perm'), false, 'permanent entity callout should be removed with its target entity');
});

test('Upgrade 6: air_sea_strike validates, smooths paths, keeps person upright, flies aircraft, and detonates strikes', () => {
  const airSeaRaw = fs.readFileSync('src/scenarios/air_sea_strike.scenario.yaml', 'utf8');
  const airSeaParsed = yaml.load(airSeaRaw) as ScenarioFile;
  assert.deepEqual(validateScenario(airSeaParsed, DEMO_MAPS[airSeaParsed.meta.map], DEMO_ACTORS), []);

  // Path smoothing simplifies clear diagonal routes into very few waypoints
  const valley = DEMO_MAPS.tactical_valley;
  const smoothLand = findPath(valley, { x: 100, y: 120 }, { x: 460, y: 360 }, 'land');
  assert.ok(smoothLand.length <= 4, `expected smoothed land path <= 4 pts, got ${smoothLand.length}`);

  // Person stays upright (angle === 0), aircraft takes off (altitude > 0) and lands back (altitude === 0)
  const sim = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, {
    meta: { title: 'physics & strike test', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'dip', actor: 'diplomat_person', at: { x: 120, y: 160 }, faction: 'blue' },
          { id: 'jet', actor: 'fighter_jet', at: 'capital_north', faction: 'blue' },
          { id: 'oil', actor: 'oil_facility', at: { x: 560, y: 200 }, faction: 'red' }
        ]
      },
      {
        at: '0.2s',
        move: { entity: 'dip', to: { x: 300, y: 260 } },
        strike: { attacker: 'jet', mode: 'airstrike', to: { x: 560, y: 200 }, radius: 75 }
      }
    ]
  });

  const startAnchor = DEMO_MAPS.geopolitics_strait.anchors.capital_north;
  const heard: string[] = [];
  sim.onSound((s) => heard.push(s));

  for (let i = 0; i < Math.round(1.5 * TICK_RATE); i++) sim.step();
  const dipMid = sim.entities.get('dip');
  const jetMid = sim.entities.get('jet');
  assert.equal(dipMid?.angle, 0, 'person angle must remain 0 so figure never flips upside-down');
  assert.ok((jetMid?.altitude ?? 0) > 0.35, 'fighter jet must climb in altitude during airstrike sortie');
  assert.ok(heard.includes('jet_takeoff'), 'airstrike should emit jet_takeoff');

  for (let i = 0; i < Math.round(8 * TICK_RATE); i++) sim.step();
  assert.equal(sim.entities.has('oil'), false, 'opposing oil_facility should be destroyed by airstrike');
  assert.ok(sim.craters.length >= 1, 'explosion should leave temporary crater decal');
  assert.ok(heard.includes('explosion'), 'impact should emit explosion sound');
  const jetEnd = sim.entities.get('jet');
  assert.ok(jetEnd, 'fighter jet must remain alive');
  const distHome = Math.hypot(jetEnd.x - startAnchor.x, jetEnd.y - startAnchor.y);
  assert.ok(distHome < 18, `fighter jet must return to takeoff base, got dist=${distHome.toFixed(1)}`);
  assert.ok((jetEnd.altitude ?? 1) < 0.05, 'fighter jet should descend and land after returning to base');

  // Ballistic missile strike test
  sim.dispatchOrder({
    type: 'strike',
    mode: 'missile',
    from: { x: 180, y: 200 },
    to: { x: 700, y: 200 },
    radius: 80,
    faction: 'blue'
  });
  sim.flushOrders();
  assert.ok(heard.includes('missile_launch'), 'missile strike should emit missile_launch');
  assert.equal(sim.projectiles.length, 1);
  for (let i = 0; i < Math.round(3 * TICK_RATE); i++) sim.step();
  assert.ok(sim.craters.length >= 1, 'missile detonation should leave crater decal');

  // Craters must fade out and disappear automatically after ~7.5s
  for (let i = 0; i < Math.round(8.5 * TICK_RATE); i++) sim.step();
  assert.equal(sim.craters.length, 0, 'temporary blast craters must expire and vanish completely');
});

test('Ships never climb onto land cells during curved turns and entities support individual scaleMul', async () => {
  const map = DEMO_MAPS.geopolitics_strait;
  const sim = new StudioEngine(map, DEMO_ACTORS, {
    meta: { title: 'sea safety & individual resize', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'carrier', actor: 'aircraft_carrier', at: 'port_south', faction: 'blue', scale: 1.65 },
          { id: 'tank', actor: 'heavy_tank', at: 'capital_north', faction: 'blue' }
        ]
      },
      {
        at: '0.1s',
        move: { entity: 'carrier', to: 'port_east' }
      },
      {
        at: '0.5s',
        resize: { entity: 'tank', scale: 0.55 }
      }
    ]
  });

  // Assert carrier never steps onto a land cell at any tick around the peninsula turn
  for (let i = 0; i < Math.round(15 * TICK_RATE); i++) {
    sim.step();
    const ship = sim.entities.get('carrier');
    assert.ok(ship);
    const gx = Math.floor(ship.x / map.cellSize);
    const gy = Math.floor(ship.y / map.cellSize);
    const cell = map.navGrid[gy * map.cols + gx];
    assert.equal(isWalkable(cell, 'sea'), true, `carrier crossed land cell (${gx},${gy})=${cell} at tick ${sim.tick}`);
  }

  // Assert individual scales remain independent
  assert.equal(sim.entities.get('carrier')?.scaleMul, 1.65);
  assert.equal(sim.entities.get('tank')?.scaleMul, 0.55);

  // ActionRecorder round-trip with spawn.scale and resize
  const { ActionRecorder } = await import('./actionRecorder');
  const rec = new ActionRecorder();
  rec.start(map.id, { x: 600, y: 400, zoom: 1 });
  rec.recordSpawn('c1', 'aircraft_carrier', map.anchors.port_south, 'blue', 1.4);
  rec.recordResize('c1', 0.75);
  rec.stop();
  const parsed = yaml.load(rec.toYaml('resize rec')) as ScenarioFile;
  assert.deepEqual(validateScenario(parsed, map, DEMO_ACTORS), []);
  const replay = new StudioEngine(map, DEMO_ACTORS, parsed);
  replay.seekToTick(Math.round(1 * TICK_RATE));
  assert.equal(replay.entities.get('c1')?.scaleMul, 0.75);
});

test('P0 Hardening: all built-in .scenario.yaml files validate cleanly', () => {
  const worldLiveStub = {
    ...DEMO_MAPS.geopolitics_strait,
    id: 'world_live',
    width: 2000,
    height: 1000,
    anchors: {
      red_sea: { x: 1210, y: 420 },
      arabian_sea: { x: 1320, y: 460 },
      riyadh: { x: 1255, y: 395 },
      mediterranean: { x: 1120, y: 315 },
      cairo: { x: 1175, y: 365 }
    }
  };
  const mapsLookup: Record<string, MapPack> = { ...DEMO_MAPS, world_live: worldLiveStub };
  for (const fname of ['strait_crisis', 'valley_advance', 'air_sea_strike', 'world_demo']) {
    const raw = fs.readFileSync(`src/scenarios/${fname}.scenario.yaml`, 'utf8');
    const parsed = yaml.load(raw) as ScenarioFile;
    assert.deepEqual(
      validateScenario(parsed, mapsLookup[parsed.meta.map], DEMO_ACTORS),
      [],
      `${fname}.scenario.yaml must have zero validation issues`
    );
  }
});

test('P0 Hardening: duplicate/empty entity IDs are rejected in validator and refused by StudioEngine', () => {
  const dupScenario: ScenarioFile = {
    meta: { title: 'dup ids', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'u1', actor: 'naval_corvette', at: 'port_south', faction: 'blue' },
          { id: 'u1', actor: 'heavy_tank', at: 'capital_north', faction: 'red' },
          { id: '   ', actor: 'heavy_tank', at: 'capital_north', faction: 'blue' }
        ]
      },
      {
        at: '1s',
        construct: { id: 'u1', actor: 'radar_outpost', at: 'capital_north', faction: 'red' }
      }
    ]
  };
  const issues = validateScenario(dupScenario, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS);
  assert.ok(issues.some((i) => i.field === 'spawn.id' && i.message.includes('مكرر')));
  assert.ok(issues.some((i) => i.field === 'spawn.id' && i.message.includes('مطلوب')));
  assert.ok(issues.some((i) => i.field === 'construct.id' && i.message.includes('مكرر')));

  const engine = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, {
    meta: { title: 'engine no overwrite', map: 'geopolitics_strait' },
    timeline: [{ at: '0s', spawn: [{ id: 'u1', actor: 'naval_corvette', at: 'port_south', faction: 'blue' }] }]
  });
  engine.dispatchOrder({
    type: 'spawn',
    id: 'u1',
    actorId: 'heavy_tank',
    at: DEMO_MAPS.geopolitics_strait.anchors.capital_north,
    faction: 'red'
  });
  engine.dispatchOrder({
    type: 'construct',
    id: 'u1',
    actorId: 'radar_outpost',
    at: DEMO_MAPS.geopolitics_strait.anchors.capital_north,
    faction: 'red',
    durationSec: 2
  });
  engine.flushOrders();
  assert.equal(engine.entities.get('u1')?.actorId, 'naval_corvette');
  assert.equal(engine.entities.get('u1')?.faction, 'blue');
});

test('P0 Hardening: post-remove and out-of-order entity lifecycle rules work accurately', () => {
  // Rejects provably post-removal move/resize/remove/callout and pre-creation move
  const badLifecycle: ScenarioFile = {
    meta: { title: 'bad lifecycle', map: 'geopolitics_strait' },
    timeline: [
      { at: '0.5s', move: { entity: 's1', to: 'strait_gate' } },
      { at: '1s', spawn: [{ id: 's1', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '2s', remove: { entity: 's1' } },
      { at: '3s', resize: { entity: 's1', scale: 1.5 }, callout: { id: 'c1', target: 's1', text: 'ghost' }, remove: { entity: 's1' } }
    ]
  };
  const badIssues = validateScenario(badLifecycle, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS);
  assert.ok(badIssues.some((i) => i.stepIndex === 0 && i.field === 'move.entity'));
  assert.ok(badIssues.some((i) => i.stepIndex === 3 && i.field === 'resize.entity'));
  assert.ok(badIssues.some((i) => i.stepIndex === 3 && i.field === 'callout.target'));
  assert.ok(badIssues.some((i) => i.stepIndex === 3 && i.field === 'remove.entity'));

  // Same `after` trigger removing then using in later step index must be rejected
  const sameAfterRemoval: ScenarioFile = {
    meta: { title: 'same trigger remove', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }, { id: 'b1', actor: 'radar_outpost', at: 'capital_north' }] },
      { at: '0.2s', move: { entity: 'scout', to: 'strait_gate' } },
      { after: 'scout.arrived', remove: { entity: 'b1' } },
      { after: 'scout.arrived', resize: { entity: 'b1', scale: 1.2 } }
    ]
  };
  const sameTrigIssues = validateScenario(sameAfterRemoval, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS);
  assert.ok(sameTrigIssues.some((i) => i.stepIndex === 3 && i.field === 'resize.entity'));

  // Accepts valid out-of-order `at` timeline AND valid cross-branch `after` referencing unit removed at later `at`
  const validOutOfOrderAndConditional: ScenarioFile = {
    meta: { title: 'valid timeline', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 's1', actor: 'naval_corvette', at: 'port_south' }, { id: 's2', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0.5s', move: { entity: 's1', to: 'strait_gate' } },
      { at: '12s', remove: { entity: 's2' } },
      { at: '4s', resize: { entity: 's2', scale: 1.3 } },
      { after: 's1.arrived', move: { entity: 's2', to: 'port_east' } }
    ]
  };
  assert.deepEqual(validateScenario(validOutOfOrderAndConditional, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS), []);
});

test('P0 Hardening: strict timing, at+after conflict, map bounds, and numeric limits are enforced', async () => {
  const { parseStrictSec } = await import('../engine/engine');
  assert.equal(parseStrictSec('0s'), 0);
  assert.equal(parseStrictSec('2.5s'), 2.5);
  assert.equal(parseStrictSec(1.5), 1.5);
  assert.equal(parseStrictSec('-5s'), null);
  assert.equal(parseStrictSec('12abc'), null);
  assert.equal(parseStrictSec('5ms'), null);
  assert.equal(parseStrictSec(''), null);
  assert.equal(parseStrictSec(Infinity), null);
  assert.equal(parseStrictSec(NaN), null);

  const badInputs: ScenarioFile = {
    meta: { title: 'bad params', map: 'geopolitics_strait', duration_hint: '0s' },
    timeline: [
      { at: '-2s', caption: { text: 'neg' } },
      { at: '12abc', caption: { text: 'malformed' } },
      { at: '1s', after: 'u1.arrived', caption: { text: 'conflict' } },
      {
        at: '0s',
        spawn: [{ id: 'u1', actor: 'naval_corvette', at: { x: 9999, y: -10 } }],
        camera: { focus: 'port_south', zoom: 99, duration: '-1s' },
        zone: { id: 'strait_choke', color: '#ef4444', opacity: 2.5, duration: '0s' },
        pulse: { at: 'port_south', radius: 0 },
        strike: { mode: 'missile', to: 'port_south', radius: -20 }
      }
    ]
  };
  const issues = validateScenario(badInputs, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS);
  for (const expectedField of [
    'meta.duration_hint',
    'at',
    'at/after',
    'spawn.at',
    'camera.zoom',
    'camera.duration',
    'zone.opacity',
    'zone.duration',
    'pulse.radius',
    'strike.radius'
  ]) {
    assert.ok(issues.some((i) => i.field === expectedField), `expected validation issue for ${expectedField}`);
  }

  // Malformed `at` must NOT execute at tick 0 in StudioEngine
  const engine = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, {
    meta: { title: 'malformed at', map: 'geopolitics_strait' },
    timeline: [{ at: 'abc', caption: { text: 'should never run' } }]
  });
  engine.step();
  assert.equal(engine.caption, '');
});

test('TASK 0.2.1: anonymous construct reserves future explicit IDs and stays deterministic across reset/seekToTick', () => {
  const scenario: ScenarioFile = {
    meta: { title: 'auto construct id reservation', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { actor: 'radar_outpost', at: 'capital_north', faction: 'blue', duration: '1s' } },
      { at: '0.5s', construct: { actor: 'supply_depot', at: 'coast_point_1', faction: 'blue', duration: '1s' } },
      { at: '1s', spawn: [{ id: 'bld_1', actor: 'heavy_tank', at: 'capital_north', faction: 'blue' }] },
      { after: 'bld_1.arrived', construct: { id: 'bld_3', actor: 'military_base', at: 'peninsula_center', faction: 'blue', duration: '1s' } },
      { at: '1.2s', move: { entity: 'bld_1', to: 'peninsula_center' } }
    ]
  };

  assert.deepEqual(validateScenario(scenario, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS), []);

  const engine = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, scenario);
  const tEarly = Math.round(0.35 * TICK_RATE);
  const tDone = Math.round(1.35 * TICK_RATE);
  for (let i = 0; i < tDone; i++) engine.step();

  // First anonymous construct MUST skip reserved 'bld_1' and get 'bld_2'
  assert.ok(engine.entities.has('bld_2'), 'first anonymous construct should skip reserved bld_1 and receive bld_2');
  // Second anonymous construct MUST skip reserved 'bld_3' and get 'bld_4'
  assert.ok(engine.entities.has('bld_4'), 'second anonymous construct should skip reserved bld_3 and receive bld_4');
  // Explicit bld_1 must be the spawned heavy_tank without collision
  assert.equal(engine.entities.get('bld_1')?.actorId, 'heavy_tank');

  // Verify deterministic IDs on seekToTick and full reset/restart
  const snapshotRun1 = [...engine.entities.keys()].sort();
  engine.seekToTick(tEarly);
  engine.seekToTick(tDone);
  assert.deepEqual([...engine.entities.keys()].sort(), snapshotRun1);

  engine.reset();
  for (let i = 0; i < tDone; i++) engine.step();
  assert.deepEqual([...engine.entities.keys()].sort(), snapshotRun1);

  // Also test multiple anonymous constructs with no explicit bld_* IDs
  const multiAnon: ScenarioFile = {
    meta: { title: 'multi anon', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { actor: 'radar_outpost', at: 'capital_north', duration: '1s' } },
      { at: '0.5s', construct: { actor: 'supply_depot', at: 'coast_point_1', duration: '1s' } },
      { at: '1s', construct: { actor: 'military_base', at: 'peninsula_center', duration: '1s' } }
    ]
  };
  const tMulti = Math.round(1.5 * TICK_RATE);
  const eng2 = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, multiAnon);
  eng2.seekToTick(tMulti);
  assert.deepEqual([...eng2.entities.keys()].sort(), ['bld_1', 'bld_2', 'bld_3']);
  eng2.reset();
  eng2.seekToTick(tMulti);
  assert.deepEqual([...eng2.entities.keys()].sort(), ['bld_1', 'bld_2', 'bld_3']);
});

test('TASK 0.2.1: .built trigger fires once upon construct completion while .arrived rejects static units and fires once on arrival', () => {
  // 1. Construct then after: <id>.built fires ONLY after build completes, once, and deterministically on reset/seekToTick
  const buildScenario: ScenarioFile = {
    meta: { title: 'construct built trigger', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { id: 'radar_1', actor: 'radar_outpost', at: 'capital_north', faction: 'blue', duration: '2s' } },
      { after: 'radar_1.built', sound: 'alert_ping', caption: { text: 'الرادار مكتمل' }, pulse: { at: 'capital_north', radius: 60 } }
    ]
  };
  assert.deepEqual(validateScenario(buildScenario, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS), []);

  const eng = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, buildScenario);
  let alertCount = 0;
  eng.onSound((s) => {
    if (s === 'alert_ping') alertCount++;
  });

  // Before 2s completion (~1.9s): must NOT trigger prematurely
  const tBeforeBuilt = Math.round(1.9 * TICK_RATE);
  const tAfterBuilt = Math.round(2.4 * TICK_RATE);
  for (let i = 0; i < tBeforeBuilt; i++) eng.step();
  assert.equal(eng.caption, '', 'after: radar_1.built must NOT fire before construction completes');
  assert.equal(alertCount, 0);

  // Advance past 2s completion: must fire exactly once
  for (let i = tBeforeBuilt; i < tAfterBuilt; i++) eng.step();
  assert.equal(eng.caption, 'الرادار مكتمل');
  assert.equal(alertCount, 1, 'after: radar_1.built must fire exactly once');
  assert.ok((eng.entities.get('radar_1')?.builtTick ?? 0) > 0);

  // Continue advancing: must NOT re-trigger
  for (let i = 0; i < Math.round(2 * TICK_RATE); i++) eng.step();
  assert.equal(alertCount, 1, 'after: radar_1.built must never repeat');

  // Verify seekToTick & reset match exact state
  eng.seekToTick(tBeforeBuilt);
  assert.equal(eng.caption, '');
  eng.seekToTick(tAfterBuilt);
  assert.equal(eng.caption, 'الرادار مكتمل');
  eng.reset();
  eng.seekToTick(tAfterBuilt);
  assert.equal(eng.caption, 'الرادار مكتمل');

  // 2. Reject impossible triggers by creation kind / actor capability
  const constructWithArrived: ScenarioFile = {
    meta: { title: 'bad construct arrived', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { id: 'r1', actor: 'radar_outpost', at: 'capital_north', duration: '1s' } },
      { after: 'r1.arrived', caption: { text: 'bad' } }
    ]
  };
  assert.ok(validateScenario(constructWithArrived, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS).some((i) => i.field === 'after'));

  const staticSpawnWithArrived: ScenarioFile = {
    meta: { title: 'bad static spawn arrived', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'base_static', actor: 'military_base', at: 'capital_north' }] },
      { after: 'base_static.arrived', caption: { text: 'impossible move' } }
    ]
  };
  assert.ok(validateScenario(staticSpawnWithArrived, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS).some((i) => i.field === 'after'));

  const spawnWithBuilt: ScenarioFile = {
    meta: { title: 'bad spawn built', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 't1', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 't1.built', caption: { text: 'not constructed' } }
    ]
  };
  assert.ok(validateScenario(spawnWithBuilt, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS).some((i) => i.field === 'after'));

  const movableWithoutMove: ScenarioFile = {
    meta: { title: 'movable without move', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 't1', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 't1.arrived', caption: { text: 'never ordered to move' } }
    ]
  };
  assert.ok(validateScenario(movableWithoutMove, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS).some((i) => i.field === 'after'));

  // 3. Movable unit spawn -> move -> after: <id>.arrived executes cleanly once
  const moveScenario: ScenarioFile = {
    meta: { title: 'movable arrived once', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'ship_1', actor: 'naval_corvette', at: 'port_south', faction: 'blue' }] },
      { at: '0.1s', move: { entity: 'ship_1', to: 'strait_gate' } },
      { after: 'ship_1.arrived', sound: 'alert_ping', caption: { text: 'وصلت الدورية' } }
    ]
  };
  assert.deepEqual(validateScenario(moveScenario, DEMO_MAPS.geopolitics_strait, DEMO_ACTORS), []);
  const shipEng = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, moveScenario);
  let arrivedAlerts = 0;
  shipEng.onSound((s) => {
    if (s === 'alert_ping') arrivedAlerts++;
  });
  for (let i = 0; i < Math.round(14 * TICK_RATE); i++) shipEng.step();
  assert.equal(shipEng.caption, 'وصلت الدورية');
  assert.equal(arrivedAlerts, 1, 'after: ship_1.arrived must fire exactly once');
});

test('TASK 0.2.1: seekToTick restores previous silent state via try/finally when an exception occurs', () => {
  const faultyMap = {
    ...DEMO_MAPS.geopolitics_strait,
    navGrid: [...DEMO_MAPS.geopolitics_strait.navGrid]
  };
  const scenario: ScenarioFile = {
    meta: { title: 'seek exception test', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'ship_1', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0.2s', move: { entity: 'ship_1', to: 'strait_gate' } },
      { at: '1s', sound: 'alert_ping' }
    ]
  };
  const engine = new StudioEngine(faultyMap, DEMO_ACTORS, scenario);
  const heard: string[] = [];
  engine.onSound((s) => heard.push(s));

  // Inject a deliberate throw when step() hits 0.2s move -> isWorldPointWalkable / findPath reads anchors or navGrid
  const origNavGrid = faultyMap.navGrid;
  const moveTick = Math.round(0.2 * TICK_RATE);
  Object.defineProperty(faultyMap, 'navGrid', {
    configurable: true,
    get() {
      if (engine.tick === moveTick) {
        throw new Error('simulated pathfinding failure');
      }
      return origNavGrid;
    }
  });

  assert.throws(() => engine.seekToTick(Math.round(0.5 * TICK_RATE)), /simulated pathfinding failure/);

  // Restore navGrid and verify silent was restored to false (future step at 1s still emits alert_ping)
  Object.defineProperty(faultyMap, 'navGrid', {
    configurable: true,
    value: origNavGrid
  });
  while (engine.tick < Math.round(1.2 * TICK_RATE)) engine.step();
  assert.ok(heard.includes('alert_ping'), 'silent flag must be restored to false in finally block after seekToTick throws');
});

test('TASK 0.2.2: causal reachability of after: entity.arrived handles ordering, cycles, independent triggers, built, and airstrikes', () => {
  const map = DEMO_MAPS.geopolitics_strait;

  // 1. move before spawn (same `at` earlier stepIndex): must reject arrived
  const moveBeforeSpawnSameAt: ScenarioFile = {
    meta: { title: 'move before spawn same at', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', move: { entity: 't1', to: 'peninsula_center' } },
      { at: '0s', spawn: [{ id: 't1', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 't1.arrived', caption: { text: 'should reject' } }
    ]
  };
  const issues1 = validateScenario(moveBeforeSpawnSameAt, map, DEMO_ACTORS);
  assert.ok(issues1.some((i) => i.stepIndex === 2 && i.field === 'after'));

  // 2. spawn then move (same step and later step): must accept arrived
  const spawnThenMoveSameStep: ScenarioFile = {
    meta: { title: 'spawn then move same step', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [{ id: 't1', actor: 'heavy_tank', at: 'capital_north' }],
        move: { entity: 't1', to: 'peninsula_center' }
      },
      { after: 't1.arrived', caption: { text: 'arrived cleanly' } }
    ]
  };
  assert.deepEqual(validateScenario(spawnThenMoveSameStep, map, DEMO_ACTORS), []);

  // 3. spawn at later time (5s) then move before it (2s): must reject scenario (including `after`)
  const lateSpawnEarlyMove: ScenarioFile = {
    meta: { title: 'late spawn early move', map: 'geopolitics_strait' },
    timeline: [
      { at: '5s', spawn: [{ id: 't1', actor: 'heavy_tank', at: 'capital_north' }] },
      { at: '2s', move: { entity: 't1', to: 'peninsula_center' } },
      { after: 't1.arrived', caption: { text: 'unreachable arrived' } }
    ]
  };
  const issues3 = validateScenario(lateSpawnEarlyMove, map, DEMO_ACTORS);
  assert.ok(issues3.some((i) => i.stepIndex === 1 && i.field === 'move.entity'));
  assert.ok(issues3.some((i) => i.stepIndex === 2 && i.field === 'after'));

  // 4. circular arrived dependency (direct self-loop AND 2-entity cycle): must reject
  const selfCircularMove: ScenarioFile = {
    meta: { title: 'self circular arrived', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 't1', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 't1.arrived', move: { entity: 't1', to: 'peninsula_center' } }
    ]
  };
  assert.ok(validateScenario(selfCircularMove, map, DEMO_ACTORS).some((i) => i.stepIndex === 1 && i.field === 'after'));

  const indirectCircularMove: ScenarioFile = {
    meta: { title: 'indirect circular arrived', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 't1', actor: 'heavy_tank', at: 'capital_north' },
          { id: 't2', actor: 'heavy_tank', at: 'coast_point_1' }
        ]
      },
      { after: 't2.arrived', move: { entity: 't1', to: 'peninsula_center' } },
      { after: 't1.arrived', move: { entity: 't2', to: 'peninsula_center' } }
    ]
  };
  const issues4b = validateScenario(indirectCircularMove, map, DEMO_ACTORS);
  assert.ok(issues4b.some((i) => i.stepIndex === 1 && i.field === 'after'));
  assert.ok(issues4b.some((i) => i.stepIndex === 2 && i.field === 'after'));

  // 5. move conditioned on valid independent trigger (`scout.arrived` or `base.built`): must accept when causal order holds
  const chainedValidTriggers: ScenarioFile = {
    meta: { title: 'chained valid independent triggers', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'scout', actor: 'naval_corvette', at: 'port_south' },
          { id: 'escort', actor: 'destroyer_ship', at: 'port_south' }
        ],
        construct: { id: 'radar_1', actor: 'radar_outpost', at: 'capital_north', duration: '1s' }
      },
      { at: '0.2s', move: { entity: 'scout', to: 'strait_gate' } },
      { after: 'scout.arrived', move: { entity: 'escort', to: 'port_east' } },
      { after: 'escort.arrived', caption: { text: 'وصلت المدمّرة بعد الكشافة' } },
      { after: 'radar_1.built', sound: 'alert_ping' }
    ]
  };
  assert.deepEqual(validateScenario(chainedValidTriggers, map, DEMO_ACTORS), []);

  // Conditional spawn order mismatch on the exact same `after` trigger must reject
  const badSameTriggerOrder: ScenarioFile = {
    meta: { title: 'bad same trigger move before spawn', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0.2s', move: { entity: 'scout', to: 'strait_gate' } },
      { after: 'scout.arrived', move: { entity: 'late_unit', to: 'coast_point_1' } },
      { after: 'scout.arrived', spawn: [{ id: 'late_unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'late_unit.arrived', caption: { text: 'unreachable' } }
    ]
  };
  assert.ok(validateScenario(badSameTriggerOrder, map, DEMO_ACTORS).some((i) => i.stepIndex === 4 && i.field === 'after'));

  // 6. construct then built remains valid
  const constructBuiltValid: ScenarioFile = {
    meta: { title: 'construct then built valid', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { id: 'fob', actor: 'military_base', at: 'capital_north', duration: '2s' } },
      { after: 'fob.built', pulse: { at: 'capital_north', radius: 65 } }
    ]
  };
  assert.deepEqual(validateScenario(constructBuiltValid, map, DEMO_ACTORS), []);

  // 7. airstrike on valid aircraft keeps `arrived` valid; airstrike on ground unit or before spawn is rejected
  const validJetStrike: ScenarioFile = {
    meta: { title: 'valid jet airstrike arrived', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'jet_1', actor: 'fighter_jet', at: 'capital_north', faction: 'blue' }] },
      { at: '0.5s', strike: { attacker: 'jet_1', mode: 'airstrike', to: 'peninsula_center', radius: 70 } },
      { after: 'jet_1.arrived', caption: { text: 'عادت المقاتلة إلى القاعدة' } }
    ]
  };
  assert.deepEqual(validateScenario(validJetStrike, map, DEMO_ACTORS), []);

  const earlyJetStrike: ScenarioFile = {
    meta: { title: 'early jet airstrike', map: 'geopolitics_strait' },
    timeline: [
      { at: '0.2s', strike: { attacker: 'jet_1', mode: 'airstrike', to: 'peninsula_center', radius: 70 } },
      { at: '2s', spawn: [{ id: 'jet_1', actor: 'fighter_jet', at: 'capital_north', faction: 'blue' }] },
      { after: 'jet_1.arrived', caption: { text: 'unreachable jet' } }
    ]
  };
  const issues7b = validateScenario(earlyJetStrike, map, DEMO_ACTORS);
  assert.ok(issues7b.some((i) => i.stepIndex === 0 && i.field === 'strike.attacker'));
  assert.ok(issues7b.some((i) => i.stepIndex === 2 && i.field === 'after'));

  const groundUnitAirstrike: ScenarioFile = {
    meta: { title: 'ground unit airstrike does not fly', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'tank_1', actor: 'heavy_tank', at: 'capital_north', faction: 'blue' }] },
      { at: '0.5s', strike: { attacker: 'tank_1', mode: 'airstrike', to: 'peninsula_center', radius: 70 } },
      { after: 'tank_1.arrived', caption: { text: 'tank never moved' } }
    ]
  };
  assert.ok(validateScenario(groundUnitAirstrike, map, DEMO_ACTORS).some((i) => i.stepIndex === 2 && i.field === 'after'));
});

test('TASK 0.2.3: cross-branch trigger causality distinguishes min/max bounds, ancestors, and indeterminate arrival order', () => {
  const map = DEMO_MAPS.geopolitics_strait;

  // 1. Independent faster branch (`base.built`) cannot execute motion on entity created `after: scout.arrived`
  const independentFasterMoveAfterArrivedCreate: ScenarioFile = {
    meta: { title: 'independent branch move after arrived create', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0s', move: { entity: 'scout', to: 'strait_gate' } },
      { at: '0s', construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'scout.arrived', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'base.built', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'unit.arrived', caption: { text: 'unprovable cross-branch order' } }
    ]
  };
  const issues1 = validateScenario(independentFasterMoveAfterArrivedCreate, map, DEMO_ACTORS);
  assert.ok(issues1.some((i) => i.stepIndex === 4 && i.field === 'move.entity'));
  assert.ok(issues1.some((i) => i.stepIndex === 5 && i.field === 'after'));

  // 2a. Inverse provable case (time-interval): `base.built` max (~1.067s) < `scout.arrived` min (> 3s)
  const provableIntervalCrossBranch: ScenarioFile = {
    meta: { title: 'provable time-interval cross-branch', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0s', construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { at: '3s', move: { entity: 'scout', to: 'strait_gate' } },
      { after: 'scout.arrived', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'unit.arrived', caption: { text: 'provable interval cross-branch ok' } }
    ]
  };
  assert.deepEqual(validateScenario(provableIntervalCrossBranch, map, DEMO_ACTORS), []);

  // 2b. Inverse provable case (causal ancestor): `scout` itself moves `after: base.built`
  const provableAncestorCrossBranch: ScenarioFile = {
    meta: { title: 'provable causal-ancestor cross-branch', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0s', construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'base.built', move: { entity: 'scout', to: 'strait_gate' } },
      { after: 'scout.arrived', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'unit.arrived', caption: { text: 'provable ancestor cross-branch ok' } }
    ]
  };
  assert.deepEqual(validateScenario(provableAncestorCrossBranch, map, DEMO_ACTORS), []);

  // 3. Timed `at` move on an entity created `after: scout.arrived` must be rejected (arrived completion has no finite upper bound)
  const timedMoveOnArrivedCreatedEntity: ScenarioFile = {
    meta: { title: 'timed move on arrived-created unit', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0s', move: { entity: 'scout', to: 'strait_gate' } },
      { after: 'scout.arrived', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { at: '5s', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'unit.arrived', caption: { text: 'unbounded arrived upper bound' } }
    ]
  };
  const issues3 = validateScenario(timedMoveOnArrivedCreatedEntity, map, DEMO_ACTORS);
  assert.ok(issues3.some((i) => i.stepIndex === 3 && i.field === 'move.entity'));
  assert.ok(issues3.some((i) => i.stepIndex === 4 && i.field === 'after'));

  // 4. Multi-level (3-level) conditional causal chain in valid order must be accepted
  const threeLevelCausalChain: ScenarioFile = {
    meta: { title: '3-level conditional causal chain', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'u1', actor: 'naval_corvette', at: 'port_south' },
          { id: 'u2', actor: 'destroyer_ship', at: 'port_south' }
        ],
        construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' }
      },
      { after: 'base.built', move: { entity: 'u1', to: 'strait_gate' } },
      { after: 'u1.arrived', move: { entity: 'u2', to: 'port_east' } },
      { after: 'u2.arrived', caption: { text: 'اكتملت السلسلة الشرطية ثلاثية المستويات' } }
    ]
  };
  assert.deepEqual(validateScenario(threeLevelCausalChain, map, DEMO_ACTORS), []);

  // 5a. 3-node cross-branch circular dependency must reject all dependent steps
  const threeNodeCrossBranchCycle: ScenarioFile = {
    meta: { title: '3-node cross-branch cycle', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'a', actor: 'heavy_tank', at: 'capital_north' },
          { id: 'b', actor: 'heavy_tank', at: 'coast_point_1' },
          { id: 'c', actor: 'heavy_tank', at: 'peninsula_center' }
        ]
      },
      { after: 'a.arrived', move: { entity: 'b', to: 'peninsula_center' } },
      { after: 'b.arrived', move: { entity: 'c', to: 'capital_north' } },
      { after: 'c.arrived', move: { entity: 'a', to: 'coast_point_1' } }
    ]
  };
  const issues5a = validateScenario(threeNodeCrossBranchCycle, map, DEMO_ACTORS);
  assert.ok(issues5a.some((i) => i.stepIndex === 1 && i.field === 'after'));
  assert.ok(issues5a.some((i) => i.stepIndex === 2 && i.field === 'after'));
  assert.ok(issues5a.some((i) => i.stepIndex === 3 && i.field === 'after'));

  // 5b. Impossible cross-branch timing (`slow_base` 5s spawns `unit`, `fast_base` 1s moves `unit`) must be rejected
  const impossibleCrossBranchTiming: ScenarioFile = {
    meta: { title: 'impossible cross-branch built timing', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { id: 'slow_base', actor: 'military_base', at: 'capital_north', duration: '5s' } },
      { at: '0s', construct: { id: 'fast_base', actor: 'radar_outpost', at: 'coast_point_1', duration: '1s' } },
      { after: 'slow_base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'fast_base.built', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'unit.arrived', caption: { text: 'impossible before slow_base' } }
    ]
  };
  const issues5b = validateScenario(impossibleCrossBranchTiming, map, DEMO_ACTORS);
  assert.ok(issues5b.some((i) => i.stepIndex === 3 && i.field === 'move.entity'));
  assert.ok(issues5b.some((i) => i.stepIndex === 4 && i.field === 'after'));
});

test('TASK 0.2.4: arrivedAncestors preserves creation ancestry alongside intersected motion paths', () => {
  const map = DEMO_MAPS.geopolitics_strait;

  // 1. Unit created `after: sub_base.built` (which builds `after: base.built`) moves on another trigger
  // and on `sub_base.built`; `unit.arrived` must preserve `sub_base.built` & `base.built` for a subsequent unit.
  const creationAncestryChainValid: ScenarioFile = {
    meta: { title: 'creation ancestry preserved across arrived chain', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'base.built', construct: { id: 'sub_base', actor: 'radar_outpost', at: 'coast_point_1', duration: '1s' } },
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '4s', move: { entity: 'scout', to: 'strait_gate' } },
      { after: 'sub_base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'sub_base.built', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'scout.arrived', move: { entity: 'unit', to: 'coast_point_1' } },
      { after: 'sub_base.built', spawn: [{ id: 'late_unit', actor: 'heavy_tank', at: 'coast_point_1' }] },
      { after: 'unit.arrived', move: { entity: 'late_unit', to: 'peninsula_center' } },
      { after: 'late_unit.arrived', caption: { text: 'تم إثبات ترتيب الإنشاء عبر أسلاف الوصول' } }
    ]
  };
  assert.deepEqual(validateScenario(creationAncestryChainValid, map, DEMO_ACTORS), []);

  // 2. Unit created `after: sub_base.built` inherits creation ancestry even when move uses timed `at`
  const singleAtMoveInheritsCreationAncestry: ScenarioFile = {
    meta: { title: 'single at move inherits creation ancestry', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'base.built', construct: { id: 'sub_base', actor: 'radar_outpost', at: 'coast_point_1', duration: '1s' } },
      { after: 'sub_base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { at: '3s', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'base.built', spawn: [{ id: 'follow_unit', actor: 'heavy_tank', at: 'coast_point_1' }] },
      { after: 'unit.arrived', move: { entity: 'follow_unit', to: 'peninsula_center' } },
      { after: 'follow_unit.arrived', caption: { text: 'تم توريث أسلاف الإنشاء مع أمر حركة at' } }
    ]
  };
  assert.deepEqual(validateScenario(singleAtMoveInheritsCreationAncestry, map, DEMO_ACTORS), []);

  // Dual moves where an `at` move empties motion intersection still preserve creation ancestry (`base.built` & `sub_base.built`)
  const atMovePlusConditionalMovePreservesCreationAncestry: ScenarioFile = {
    meta: { title: 'at plus conditional moves keep creation ancestry', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'base.built', construct: { id: 'sub_base', actor: 'radar_outpost', at: 'coast_point_1', duration: '1s' } },
      { after: 'sub_base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'sub_base.built', move: { entity: 'unit', to: 'peninsula_center' } },
      { at: '5s', move: { entity: 'unit', to: 'coast_point_1' } },
      { after: 'sub_base.built', spawn: [{ id: 'follow_unit', actor: 'heavy_tank', at: 'coast_point_1' }] },
      { after: 'unit.arrived', move: { entity: 'follow_unit', to: 'peninsula_center' } },
      { after: 'follow_unit.arrived', caption: { text: 'نجحت مع وجود at وحركة شرطية' } }
    ]
  };
  assert.deepEqual(validateScenario(atMovePlusConditionalMovePreservesCreationAncestry, map, DEMO_ACTORS), []);

  // 3. Multiple valid moves: inherit ONLY common dependency across motion paths while keeping shared creation ancestors.
  // `shared_gate` has unbounded upper bound (built after `scout.arrived`), so `u_shared` can only prove order via shared motion ancestry.
  const sharedMotionAndCreationAncestryAccepted: ScenarioFile = {
    meta: { title: 'shared motion dependency plus creation ancestry accepted', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0s', move: { entity: 'scout', to: 'strait_gate' } },
      { at: '0s', construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'scout.arrived', construct: { id: 'shared_gate', actor: 'radar_outpost', at: 'coast_point_1', duration: '1s' } },
      { after: 'shared_gate.built', construct: { id: 'branch_a', actor: 'radar_outpost', at: 'peninsula_center', duration: '1s' } },
      { after: 'shared_gate.built', construct: { id: 'branch_b', actor: 'radar_outpost', at: 'capital_north', duration: '1s' } },
      { after: 'branch_b.built', construct: { id: 'only_b', actor: 'radar_outpost', at: 'coast_point_1', duration: '1s' } },
      { after: 'base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'branch_a.built', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'only_b.built', move: { entity: 'unit', to: 'coast_point_1' } },
      { after: 'shared_gate.built', spawn: [{ id: 'u_shared', actor: 'heavy_tank', at: 'coast_point_1' }] },
      { after: 'unit.arrived', move: { entity: 'u_shared', to: 'peninsula_center' } },
      { after: 'u_shared.arrived', caption: { text: 'تم توريث الاعتماد المشترك بين المسارات' } }
    ]
  };
  assert.deepEqual(validateScenario(sharedMotionAndCreationAncestryAccepted, map, DEMO_ACTORS), []);

  // Single-branch dependency `only_b.built` is NOT shared with `branch_a.built`, so `u_only_b` must be REJECTED
  const unsharedMotionBranchRejected: ScenarioFile = {
    meta: { title: 'unshared motion branch dependency rejected', map: 'geopolitics_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'scout', actor: 'naval_corvette', at: 'port_south' }] },
      { at: '0s', move: { entity: 'scout', to: 'strait_gate' } },
      { at: '0s', construct: { id: 'base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'scout.arrived', construct: { id: 'shared_gate', actor: 'radar_outpost', at: 'coast_point_1', duration: '1s' } },
      { after: 'shared_gate.built', construct: { id: 'branch_a', actor: 'radar_outpost', at: 'peninsula_center', duration: '1s' } },
      { after: 'shared_gate.built', construct: { id: 'branch_b', actor: 'radar_outpost', at: 'capital_north', duration: '1s' } },
      { after: 'branch_b.built', construct: { id: 'only_b', actor: 'radar_outpost', at: 'coast_point_1', duration: '1s' } },
      { after: 'base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'branch_a.built', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'only_b.built', move: { entity: 'unit', to: 'coast_point_1' } },
      { after: 'only_b.built', spawn: [{ id: 'u_only_b', actor: 'heavy_tank', at: 'coast_point_1' }] },
      { after: 'unit.arrived', move: { entity: 'u_only_b', to: 'peninsula_center' } },
      { after: 'u_only_b.arrived', caption: { text: 'should reject unshared branch' } }
    ]
  };
  const issuesUnshared = validateScenario(unsharedMotionBranchRejected, map, DEMO_ACTORS);
  assert.ok(issuesUnshared.some((i) => i.stepIndex === 11 && i.field === 'move.entity'));
  assert.ok(issuesUnshared.some((i) => i.stepIndex === 12 && i.field === 'after'));

  // 4. Circular construction + arrival cycle must still be rejected cleanly without hanging
  const constructArrivedCycle: ScenarioFile = {
    meta: { title: 'construct arrived cycle', map: 'geopolitics_strait' },
    timeline: [
      { after: 'unit.arrived', construct: { id: 'cyc_base', actor: 'military_base', at: 'capital_north', duration: '1s' } },
      { after: 'cyc_base.built', spawn: [{ id: 'unit', actor: 'heavy_tank', at: 'capital_north' }] },
      { after: 'cyc_base.built', move: { entity: 'unit', to: 'peninsula_center' } },
      { after: 'unit.arrived', caption: { text: 'cyclic unreachable' } }
    ]
  };
  const issuesCycle = validateScenario(constructArrivedCycle, map, DEMO_ACTORS);
  assert.ok(issuesCycle.some((i) => i.stepIndex === 0 && i.field === 'after'));
  assert.ok(issuesCycle.some((i) => i.stepIndex === 3 && i.field === 'after'));
});

test('Ships traverse narrow straits, canal bends (cell=3), and island obstacles without getting stuck or crossing land', () => {
  const buildBentStraitMap = (widthCells: number, cellVal: NavCell, cellSize: number): MapPack => {
    const cols = 30;
    const rows = 20;
    const navGrid: NavCell[] = new Array(cols * rows).fill(0);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (x < 8 || x > 21) navGrid[y * cols + x] = 1;
        else if (x >= 8 && x <= 14 && y >= 9 && y < 9 + widthCells) navGrid[y * cols + x] = cellVal;
        else if (x >= 14 && x <= 14 + widthCells - 1 && y >= 5 && y < 9 + widthCells) navGrid[y * cols + x] = cellVal;
        else if (x >= 14 && x <= 21 && y >= 5 && y < 5 + widthCells) navGrid[y * cols + x] = cellVal;
      }
    }
    return {
      id: `strait_${widthCells}_${cellVal}_${cellSize}`,
      title: 'strait test',
      kind: 'geopolitical',
      width: cols * cellSize,
      height: rows * cellSize,
      cellSize,
      cols,
      rows,
      navGrid,
      svgOrUrl: '',
      anchors: {},
      zones: {}
    };
  };

  for (const actor of ['naval_corvette', 'aircraft_carrier'] as const) {
    for (const cellVal of [1, 3] as NavCell[]) {
      for (const widthCells of [1, 2, 3]) {
        for (const cellSize of [8, 20]) {
          const m = buildBentStraitMap(widthCells, cellVal, cellSize);
          const from = { x: 4 * cellSize, y: 12 * cellSize };
          const to = { x: 25 * cellSize, y: 3 * cellSize };
          const eng = new StudioEngine(m, DEMO_ACTORS, {
            meta: { title: 'strait transit', map: m.id },
            timeline: [
              { at: '0s', spawn: [{ id: 'ship', actor, at: from }] },
              { at: '0.1s', move: { entity: 'ship', to } }
            ]
          });
          for (let t = 0; t < Math.round(50 * TICK_RATE); t++) {
            eng.step();
            const ship = eng.entities.get('ship')!;
            const gx = Math.floor(ship.x / cellSize);
            const gy = Math.floor(ship.y / cellSize);
            assert.equal(
              isWalkable(m.navGrid[gy * m.cols + gx], 'sea'),
              true,
              `${actor} crossed land in strait w=${widthCells}, cell=${cellVal}, cs=${cellSize} at tick ${t}`
            );
            if (ship.arrivedTick !== null) break;
          }
          const finalShip = eng.entities.get('ship')!;
          assert.notEqual(
            finalShip.arrivedTick,
            null,
            `${actor} got stuck in strait w=${widthCells}, cell=${cellVal}, cs=${cellSize} at (${finalShip.x.toFixed(1)}, ${finalShip.y.toFixed(1)})`
          );
        }
      }
    }
  }

  // Island-near-turning-arc scenario (reproducing Socotra-style obstruction during 180-degree initial turn)
  const cols = 32;
  const rows = 20;
  const cs = 8;
  const islandGrid: NavCell[] = new Array(cols * rows).fill(1);
  // Mainland coastline along bottom-left + narrow 2-cell strait at x=8..13, y=9..10 + small island blocking turn arc at (20, 12)
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x >= 8 && x <= 13 && (y < 9 || y > 10)) islandGrid[y * cols + x] = 0;
    }
  }
  islandGrid[12 * cols + 20] = 0; // Island right next to ship's south-west turning arc
  islandGrid[13 * cols + 19] = 0;

  const islandMap: MapPack = {
    id: 'island_strait',
    title: 'island strait',
    kind: 'geopolitical',
    width: cols * cs,
    height: rows * cs,
    cellSize: cs,
    cols,
    rows,
    navGrid: islandGrid,
    svgOrUrl: '',
    anchors: {},
    zones: {}
  };

  const islandSim = new StudioEngine(islandMap, DEMO_ACTORS, {
    meta: { title: 'island turn strait', map: 'island_strait' },
    timeline: [
      { at: '0s', spawn: [{ id: 'fleet', actor: 'naval_corvette', at: { x: 24 * cs + 4, y: 11 * cs + 4 } }] },
      { at: '0.1s', move: { entity: 'fleet', to: { x: 4 * cs + 4, y: 8 * cs + 4 } } }
    ]
  });
  for (let t = 0; t < Math.round(50 * TICK_RATE); t++) {
    islandSim.step();
    const fleet = islandSim.entities.get('fleet')!;
    const gx = Math.floor(fleet.x / cs);
    const gy = Math.floor(fleet.y / cs);
    assert.equal(isWalkable(islandMap.navGrid[gy * cols + gx], 'sea'), true, `ship entered land at (${gx},${gy})`);
    if (fleet.arrivedTick !== null) break;
  }
  assert.notEqual(islandSim.entities.get('fleet')?.arrivedTick, null, 'ship must navigate around island and through strait without getting stuck');
});

test('StudioUnits distinct weapon ballistics: straight shell, rapid bullet burst, artillery, torpedo, scan, and continuous multi-strike', async () => {
  const { STUDIO_ACTORS } = await import('../packs/studioUnits');
  const map = DEMO_MAPS.geopolitics_strait;

  const scenario: ScenarioFile = {
    meta: { title: 'multi-weapon test', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'tank_1', actor: 'mbt_tank', at: { x: 180, y: 180 }, faction: 'blue' },
          { id: 'squad_1', actor: 'infantry_squad', at: { x: 160, y: 240 }, faction: 'blue' },
          { id: 'tel_1', actor: 'ballistic_tel', at: { x: 140, y: 140 }, faction: 'blue' },
          { id: 'sub_1', actor: 'attack_sub', at: 'port_south', faction: 'blue' },
          { id: 'radar_1', actor: 'radar_defense', at: { x: 220, y: 140 }, faction: 'blue' },
          { id: 'enemy_1', actor: 'mbt_tank', at: { x: 340, y: 180 }, faction: 'red' },
          { id: 'enemy_2', actor: 'infantry_squad', at: { x: 300, y: 240 }, faction: 'red' }
        ]
      }
    ]
  };
  assert.deepEqual(validateScenario(scenario, map, STUDIO_ACTORS), []);

  const sim = new StudioEngine(map, STUDIO_ACTORS, scenario);
  const heard: string[] = [];
  sim.onSound((s) => heard.push(s));

  // 1. Tank shell: straight flat trajectory (altitude <= 0.1), muzzle flash, cannon_fire sound
  sim.dispatchOrder({ type: 'strike', attackerId: 'tank_1', mode: 'shell', to: { x: 340, y: 180 }, radius: 36 });
  sim.flushOrders();
  assert.ok(heard.includes('cannon_fire'), 'tank shell must emit cannon_fire');
  assert.equal(sim.muzzleFlashes.length, 1);
  assert.equal(sim.projectiles.length, 1);
  assert.equal(sim.projectiles[0].mode, 'shell');
  assert.ok(sim.projectiles[0].altitude <= 0.1, 'tank shell trajectory must stay flat/straight');

  for (let i = 0; i < Math.round(0.5 * TICK_RATE); i++) sim.step();
  assert.equal(sim.entities.has('enemy_1'), false, 'enemy tank should be destroyed by direct shell impact');

  // 2. Infantry bullet burst: 5 staggered tracer rounds, gunfire_burst sound, no crater left behind
  const cratersBeforeBullets = sim.craters.length;
  sim.dispatchOrder({ type: 'strike', attackerId: 'squad_1', mode: 'bullet', to: { x: 300, y: 240 }, radius: 18 });
  sim.flushOrders();
  assert.ok(heard.includes('gunfire_burst'), 'infantry fire must emit gunfire_burst');
  assert.equal(sim.projectiles.filter((p) => p.mode === 'bullet').length, 5, 'bullet mode spawns 5 staggered tracer rounds');

  for (let i = 0; i < Math.round(1.0 * TICK_RATE); i++) sim.step();
  assert.equal(sim.entities.has('enemy_2'), false, 'enemy squad hit by bullet burst should be eliminated');
  assert.equal(sim.craters.length, cratersBeforeBullets, 'bullet burst must not leave artillery craters');

  // 3. Submarine torpedo + Radar scan + Continuous consecutive missile strikes
  sim.dispatchOrder({ type: 'strike', attackerId: 'sub_1', mode: 'torpedo', to: { x: 520, y: 420 }, radius: 52 });
  sim.dispatchOrder({ type: 'strike', attackerId: 'radar_1', mode: 'scan', to: { x: 400, y: 200 }, radius: 120 });
  sim.dispatchOrder({ type: 'strike', attackerId: 'tel_1', mode: 'missile', to: { x: 500, y: 160 }, radius: 82 });
  sim.dispatchOrder({ type: 'strike', attackerId: 'tel_1', mode: 'missile', to: { x: 640, y: 210 }, radius: 82 });
  sim.flushOrders();

  assert.ok(heard.includes('torpedo_launch'), 'torpedo strike must emit torpedo_launch');
  assert.ok(heard.includes('radar_ping'), 'scan mode must emit radar_ping');
  assert.ok(heard.includes('missile_launch'), 'ballistic TEL must emit missile_launch');
  assert.equal(sim.projectiles.filter((p) => p.mode === 'missile').length, 2, 'consecutive missile strikes both launch');
  assert.equal(sim.muzzleFlashes.length, 2, 'consecutive missile launches emit launch flashes');
  assert.ok(sim.pulses.length >= 1, 'radar scan must emit visual pulse');
});

test('TargetingLock: hold progression, aggressive color escalation, and locked blast radius boost', async () => {
  const {
    LOCK_HOLD_THRESHOLD_MS,
    LOCK_COMPLETE_MS,
    computeTargetingLockProgress,
    getAggressiveLockStyle,
    computeLockedStrikeRadius
  } = await import('./targetingLock');

  // Short tap below threshold stays idle (instant strike without lock wait)
  assert.deepEqual(computeTargetingLockProgress(0), { phase: 'idle', progress: 0 });
  assert.deepEqual(computeTargetingLockProgress(LOCK_HOLD_THRESHOLD_MS - 10), { phase: 'idle', progress: 0 });

  // Midway hold enters 'locking' with escalating aggressive style
  const midMs = (LOCK_HOLD_THRESHOLD_MS + LOCK_COMPLETE_MS) / 2;
  const mid = computeTargetingLockProgress(midMs);
  assert.equal(mid.phase, 'locking');
  assert.ok(mid.progress > 0.4 && mid.progress < 0.6);

  const idleStyle = getAggressiveLockStyle('idle', 0, 0x38bdf8);
  const lockingStyle = getAggressiveLockStyle('locking', mid.progress, 0x38bdf8);
  const lockedStyle = getAggressiveLockStyle('locked', 1, 0x38bdf8);

  assert.equal(idleStyle.primaryColor, 0x38bdf8);
  assert.notEqual(lockingStyle.primaryColor, 0x38bdf8);
  assert.equal(lockedStyle.primaryColor, 0xff1e42);
  assert.ok(lockedStyle.bracketScale < idleStyle.bracketScale, 'locked brackets must contract tighter');
  assert.ok(lockedStyle.lineWidth > idleStyle.lineWidth, 'locked reticle lines must become bolder');
  assert.ok(lockedStyle.rotationSpeed > lockingStyle.rotationSpeed, 'locked reticle spins faster');

  // Completing hold reaches 'locked' and boosts strike blast radius by 25%
  const full = computeTargetingLockProgress(LOCK_COMPLETE_MS + 100);
  assert.deepEqual(full, { phase: 'locked', progress: 1 });
  assert.equal(computeLockedStrikeRadius(80, 'idle'), 80);
  assert.equal(computeLockedStrikeRadius(80, 'locking'), 80);
  assert.equal(computeLockedStrikeRadius(80, 'locked'), 100);
});

test('CinematicDirector: tracks moving units, projectiles, prioritizes explosions, respects user pause, and pulls back to establishing shot', async () => {
  const { CinematicDirector } = await import('./cinematicDirector');
  const { STUDIO_ACTORS } = await import('../packs/studioUnits');
  const map = DEMO_MAPS.geopolitics_strait;
  const director = new CinematicDirector();
  const vp = { width: 1280, height: 800 };

  const sim = new StudioEngine(map, STUDIO_ACTORS, {
    meta: { title: 'cinematic test', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'tel_1', actor: 'ballistic_tel', at: { x: 180, y: 200 }, faction: 'blue' },
          { id: 'tank_1', actor: 'mbt_tank', at: { x: 240, y: 240 }, faction: 'blue' }
        ]
      }
    ]
  });

  // 1. Before any event, director returns null
  assert.equal(director.evaluate(sim, 0, vp), null);

  // 2. Unit movement triggers 'movement' focus
  sim.dispatchOrder({ type: 'move', entityId: 'tank_1', to: { x: 460, y: 240 } });
  sim.flushOrders();
  sim.step();
  const moveShot = director.evaluate(sim, 1, vp);
  assert.ok(moveShot);
  assert.equal(moveShot.focusKind, 'movement');

  // 3. Launching a missile overrides movement -> 'projectile' focus and tightens zoom as it flies
  sim.dispatchOrder({ type: 'strike', attackerId: 'tel_1', mode: 'missile', to: { x: 860, y: 500 }, radius: 82 });
  sim.flushOrders();
  sim.step();
  const projEarly = director.evaluate(sim, 1.2, vp);
  assert.ok(projEarly);
  assert.equal(projEarly.focusKind, 'projectile');

  for (let i = 0; i < Math.round(0.67 * TICK_RATE); i++) sim.step();
  const projLate = director.evaluate(sim, 1.8, vp);
  assert.ok(projLate);
  assert.equal(projLate.focusKind, 'projectile');
  assert.ok(projLate.zoom >= projEarly.zoom, 'camera should tighten framing as missile approaches target');

  // 4. Impact triggers 'explosion' priority centered on blast coordinates
  while (sim.explosions.length === 0) sim.step();
  const expShot = director.evaluate(sim, 3.0, vp);
  assert.ok(expShot);
  assert.equal(expShot.focusKind, 'explosion');
  assert.ok(Math.abs(expShot.x - 860) < 2 && Math.abs(expShot.y - 500) < 2);

  // 5. User pan pauses automatic tracking temporarily, resumeImmediately restores it
  director.notifyUserInteraction(3.0, 2.5);
  assert.equal(director.evaluate(sim, 3.5, vp), null);
  director.resumeImmediately();
  assert.notEqual(director.evaluate(sim, 3.5, vp), null);

  // 6. Once explosions/projectiles finish and linger expires, director pulls back to 'establishing'
  for (let i = 0; i < Math.round(3 * TICK_RATE); i++) sim.step();
  const estShot = director.evaluate(sim, 10.0, vp);
  assert.ok(estShot);
  assert.equal(estShot.focusKind, 'establishing');
});

test('world_live Sinai land bridge connects Riyadh & Jordan to Cairo/Egypt while preserving Suez sea passage', async () => {
  const { geoContains } = await import('d3-geo');
  const { feature } = await import('topojson-client');
  const worldAtlasMod = await import('world-atlas/countries-110m.json');
  const worldAtlas = (worldAtlasMod as unknown as { default?: any }).default ?? worldAtlasMod;
  const { createWorldProjection, applyWorldNavCorridors } = await import('../maps/worldGeoEngine');

  const width = 1920;
  const height = 1080;
  const cellSize = 8;
  const cols = Math.floor(width / cellSize);
  const rows = Math.floor(height / cellSize);
  const landGeom = feature(worldAtlas, worldAtlas.objects.land);
  const projection = createWorldProjection(width, height);

  const navGrid: NavCell[] = new Array(cols * rows).fill(1);
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const px = gx * cellSize + cellSize * 0.5;
      const py = gy * cellSize + cellSize * 0.5;
      const ll = projection.invert?.([px, py]);
      if (ll && geoContains(landGeom as any, ll)) {
        navGrid[gy * cols + gx] = 0;
      }
    }
  }
  applyWorldNavCorridors(navGrid, cols, rows, projection, cellSize);

  const pt = (ll: [number, number]) => {
    const p = projection(ll)!;
    return { x: Math.round(p[0]), y: Math.round(p[1]) };
  };

  const worldMap: MapPack = {
    id: 'world_live',
    title: 'خريطة العالم',
    kind: 'geopolitical',
    geoLevel: 'world',
    width,
    height,
    cellSize,
    cols,
    rows,
    navGrid,
    svgOrUrl: '',
    anchors: {
      arabian_sea: pt([63.0, 15.0]),
      red_sea: pt([38.5, 20.5]),
      mediterranean: pt([18.0, 35.0]),
      black_sea: pt([34.0, 43.0]),
      riyadh: pt([46.7, 24.7]),
      cairo: pt([31.2, 30.0]),
      jordan: pt([36.5, 31.2]),
      egypt: pt([30.8, 26.8]),
      usa: pt([-98.0, 39.0])
    },
    zones: {}
  };

  // Land routes across Sinai must succeed and never step onto sea (cell=1)
  for (const [fromKey, toKey] of [
    ['riyadh', 'cairo'],
    ['jordan', 'cairo'],
    ['jordan', 'egypt']
  ] as const) {
    const path = findPath(worldMap, worldMap.anchors[fromKey], worldMap.anchors[toKey], 'land');
    assert.ok(path.length > 0, `land path ${fromKey} -> ${toKey} across Sinai must succeed`);
    let prev = worldMap.anchors[fromKey];
    for (const wp of path) {
      for (let s = 0; s <= 12; s++) {
        const x = prev.x + ((wp.x - prev.x) * s) / 12;
        const y = prev.y + ((wp.y - prev.y) * s) / 12;
        const gx = Math.floor(x / cellSize);
        const gy = Math.floor(y / cellSize);
        assert.equal(isWalkable(navGrid[gy * cols + gx], 'land'), true, `${fromKey}->${toKey} stepped on sea cell at (${gx},${gy})`);
      }
      prev = wp;
    }
  }

  // Sea routes through Bab el-Mandeb, Red Sea, Suez, and Bosphorus must succeed
  const medSeaPath = findPath(worldMap, worldMap.anchors.arabian_sea, worldMap.anchors.mediterranean, 'sea');
  assert.ok(medSeaPath.length > 0, 'sea path arabian_sea -> mediterranean via Suez must succeed');
  const blackSeaPath = findPath(worldMap, worldMap.anchors.arabian_sea, worldMap.anchors.black_sea, 'sea');
  assert.ok(blackSeaPath.length > 0, 'sea path arabian_sea -> black_sea via Bosphorus must succeed');

  // Tanks cannot cross oceans
  assert.deepEqual(findPath(worldMap, worldMap.anchors.riyadh, worldMap.anchors.usa, 'land'), []);
  assert.deepEqual(findPath(worldMap, worldMap.anchors.riyadh, worldMap.anchors.mediterranean, 'land'), []);

  // Full world_demo.scenario.yaml execution must complete without onMoveBlocked
  const demoRaw = fs.readFileSync('src/scenarios/world_demo.scenario.yaml', 'utf8');
  const demoParsed = yaml.load(demoRaw) as ScenarioFile;
  assert.deepEqual(validateScenario(demoParsed, worldMap, DEMO_ACTORS), []);
  const eng = new StudioEngine(worldMap, DEMO_ACTORS, demoParsed);
  let blockedCount = 0;
  eng.onMoveBlocked(() => {
    blockedCount++;
  });
  for (let t = 0; t < Math.round(60 * TICK_RATE); t++) {
    eng.step();
    const armor = eng.entities.get('armor_1');
    const fleet = eng.entities.get('fleet_red');
    if (armor?.arrivedTick !== null && fleet?.arrivedTick !== null) break;
  }
  assert.equal(blockedCount, 0, 'world_demo tank & ship must never emit onMoveBlocked');
  assert.notEqual(eng.entities.get('armor_1')?.arrivedTick, null, 'armor_1 must arrive in Cairo across Sinai');
  assert.notEqual(eng.entities.get('fleet_red')?.arrivedTick, null, 'fleet_red must arrive in Mediterranean via Suez');
});

test('formatYamlSyntaxErrorAr translates js-yaml syntax errors cleanly into Arabic with line numbers', () => {
  const samples = [
    'meta:\n  title: "test"\n    bad: 1',
    'meta:\n  title: "unclosed\ntimeline: []',
    'meta:\n  title: a\n  title: b\ntimeline: []'
  ];
  for (const src of samples) {
    let caught: unknown = null;
    try {
      yaml.load(src);
    } catch (err) {
      caught = err;
    }
    assert.ok(caught, 'expected yaml.load to throw syntax error');
    const msg = formatYamlSyntaxErrorAr(caught);
    assert.ok(msg.includes('خطأ في صياغة YAML'), `expected Arabic header, got: ${msg}`);
    assert.ok(msg.includes('السطر'), `expected Arabic line number, got: ${msg}`);
  }
});

test('CinematicDirector enforces bounded zoom on desktop/mobile and holds explosion aftermath over background motion', async () => {
  const { CinematicDirector } = await import('./cinematicDirector');
  const { STUDIO_ACTORS } = await import('../packs/studioUnits');
  const map: MapPack = {
    ...DEMO_MAPS.geopolitics_strait,
    width: 1920,
    height: 1080
  };
  const director = new CinematicDirector();
  const mobileVp = { width: 390, height: 844 };
  const desktopVp = { width: 1440, height: 900 };

  const sim = new StudioEngine(map, STUDIO_ACTORS, {
    meta: { title: 'cinematic bounds & aftermath', map: map.id },
    timeline: [
      {
        at: '0s',
        spawn: [
          { id: 'tel_1', actor: 'ballistic_tel', at: { x: 220, y: 240 }, faction: 'blue' },
          { id: 'tank_1', actor: 'mbt_tank', at: { x: 180, y: 300 }, faction: 'blue' }
        ]
      }
    ]
  });

  sim.dispatchOrder({ type: 'move', entityId: 'tank_1', to: { x: 760, y: 300 } });
  sim.dispatchOrder({ type: 'strike', attackerId: 'tel_1', mode: 'missile', to: { x: 640, y: 420 }, radius: 82 });
  sim.flushOrders();
  sim.step();

  const fitMobile = Math.min(mobileVp.width / map.width, mobileVp.height / map.height) * 0.94;
  const fitDesktop = Math.min(desktopVp.width / map.width, desktopVp.height / map.height) * 0.94;

  const mobileProj = director.evaluate(sim, 1.0, mobileVp);
  assert.ok(mobileProj);
  assert.ok(mobileProj.zoom >= fitMobile && mobileProj.zoom <= 2.6, `mobile zoom out of bounds: ${mobileProj.zoom}`);

  const desktopProj = director.evaluate(sim, 1.1, desktopVp);
  assert.ok(desktopProj);
  assert.ok(desktopProj.zoom >= fitDesktop && desktopProj.zoom <= 2.6, `desktop zoom out of bounds: ${desktopProj.zoom}`);

  while (sim.explosions.length === 0) sim.step();
  const expActive = director.evaluate(sim, 2.0, desktopVp);
  assert.equal(expActive?.focusKind, 'explosion');

  // Drain explosion particles so only tank_1 movement remains active; aftermath must still hold explosion focus briefly
  while (sim.explosions.length > 0) sim.step();
  assert.equal(sim.explosions.length, 0);
  const aftermathShot = director.evaluate(sim, 2.5, desktopVp);
  assert.equal(aftermathShot?.focusKind, 'explosion', 'aftermath hold should linger on strike impact before snapping back to mover');
});

test('cameraTransform maintains distortion-free uniform matrix, cinematic safe insets, and round-trip projection', async () => {
  const {
    getSafeViewportFrame,
    computeSafeFitZoom,
    clampCameraState,
    computeWorldTransform,
    projectWorldToScreen,
    unprojectScreenToWorld
  } = await import('./cameraTransform');

  // 1. Safe viewport insets subtract 56px top and 64px bottom letterbox frames on desktop
  const desktopFrame = getSafeViewportFrame(1440, 900, true);
  assert.equal(desktopFrame.topInset, 56);
  assert.equal(desktopFrame.bottomInset, 64);
  assert.equal(desktopFrame.safeHeight, 780);
  assert.equal(desktopFrame.centerX, 720);
  assert.equal(desktopFrame.centerY, 446);

  const normalFrame = getSafeViewportFrame(1440, 900, false);
  assert.equal(normalFrame.topInset, 0);
  assert.equal(normalFrame.bottomInset, 0);
  assert.equal(normalFrame.centerY, 450);

  // 2. Fit zoom in cinematic mode projects the entire map strictly inside [topInset, screenH - bottomInset]
  for (const vp of [
    { w: 1440, h: 900 },
    { w: 390, h: 844 }
  ]) {
    const frame = getSafeViewportFrame(vp.w, vp.h, true);
    const fitZoom = computeSafeFitZoom(2000, 1000, vp.w, vp.h, true);
    const topEdge = projectWorldToScreen(1000, 0, 1000, 500, fitZoom, vp.w, vp.h, true);
    const bottomEdge = projectWorldToScreen(1000, 1000, 1000, 500, fitZoom, vp.w, vp.h, true);
    const leftEdge = projectWorldToScreen(0, 500, 1000, 500, fitZoom, vp.w, vp.h, true);
    const rightEdge = projectWorldToScreen(2000, 500, 1000, 500, fitZoom, vp.w, vp.h, true);
    assert.ok(topEdge.y >= frame.topInset - 1e-6, `top map edge ${topEdge.y} crossed top bar ${frame.topInset}`);
    assert.ok(
      bottomEdge.y <= vp.h - frame.bottomInset + 1e-6,
      `bottom map edge ${bottomEdge.y} crossed bottom bar ${vp.h - frame.bottomInset}`
    );
    assert.ok(leftEdge.x >= -1e-6 && rightEdge.x <= vp.w + 1e-6);
  }

  // 3. Matrix transform stays uniform (scaleX === scaleY), rotation/skew = 0, finite even with NaN/out-of-bounds inputs
  const sanitized = computeWorldTransform(NaN, Infinity, -3, 2000, 1000, 1440, 900, true, 99, -99);
  assert.equal(sanitized.scaleX, sanitized.scaleY);
  assert.ok(Number.isFinite(sanitized.posX) && Number.isFinite(sanitized.posY));
  assert.ok(Number.isFinite(sanitized.pivotX) && Number.isFinite(sanitized.pivotY));
  assert.equal(sanitized.rotation, 0);
  assert.equal(sanitized.skewX, 0);
  assert.equal(sanitized.skewY, 0);
  // At fit zoom, whole map fits vertically on desktop so shakeY is suppressed (posY === frame.centerY)
  assert.equal(sanitized.posY, desktopFrame.centerY);

  // 4. Clamping prevents zoomed-in drift outside map boundaries
  const clamped = clampCameraState(-5000, 99999, 2.5, 2000, 1000, 1440, 900, true);
  assert.ok(clamped.x >= 1440 / (2 * 2.5) - 1e-6);
  assert.ok(clamped.y <= 1000 - desktopFrame.safeHeight / (2 * 2.5) + 1e-6);

  // 5. Exact inverse projection symmetry across desktop and mobile with cinematic ON/OFF
  for (const cin of [true, false]) {
    for (const vp of [
      { w: 1440, h: 900 },
      { w: 390, h: 844 }
    ]) {
      const scr = projectWorldToScreen(1234.5, 456.75, 1100, 420, 1.75, vp.w, vp.h, cin);
      const wrl = unprojectScreenToWorld(scr.x, scr.y, 1100, 420, 1.75, vp.w, vp.h, cin);
      assert.ok(Math.abs(wrl.x - 1234.5) < 1e-6 && Math.abs(wrl.y - 456.75) < 1e-6);
    }
  }
});

test('tactical_pickup military vehicle is registered and references its bundled transparent PNG', async () => {
  const { sanitizeAssetUrl, validatePackBundle } = await import('../packs/packSchema');
  const reg = new PackRegistry(false);
  const pickup = reg.actors.tactical_pickup;
  assert.ok(pickup, 'tactical_pickup should exist in PackRegistry');
  assert.equal(pickup.kind, 'vehicle');
  assert.equal(pickup.domain, 'land');
  assert.equal(pickup.ability?.category, 'armor');
  assert.equal(pickup.ability?.mode, 'bullet');

  assert.equal(sanitizeAssetUrl(pickup.svg), '/vehicles/hilux-technical.png');
  assert.doesNotThrow(() => validatePackBundle({ actors: [pickup] }));
});

test('cameraTransform supports 2.5D bearing/tilt presets, round-trip projection, and delta unprojection', async () => {
  const {
    MAX_TILT_DEG,
    CAMERA_ANGLE_PRESETS,
    computeWorldTransform,
    projectWorldToScreen,
    unprojectScreenToWorld,
    unprojectScreenDeltaToWorld,
    tiltToScaleYRatio
  } = await import('./cameraTransform');

  assert.ok(CAMERA_ANGLE_PRESETS.length >= 5);
  assert.equal(tiltToScaleYRatio(0), 1);
  assert.ok(tiltToScaleYRatio(90) >= 0.55, 'clamped MAX_TILT_DEG should keep vertical scale comfortable');

  for (const cin of [true, false]) {
    for (const vp of [
      { w: 1440, h: 900 },
      { w: 390, h: 844 }
    ]) {
      for (const ang of [
        { bearing: 35, tilt: 35 },
        { bearing: -24, tilt: 48 },
        { bearing: 125, tilt: MAX_TILT_DEG }
      ]) {
        const scr = projectWorldToScreen(
          1310.25,
          612.5,
          1000,
          500,
          1.45,
          vp.w,
          vp.h,
          cin,
          ang.bearing,
          ang.tilt
        );
        const wrl = unprojectScreenToWorld(
          scr.x,
          scr.y,
          1000,
          500,
          1.45,
          vp.w,
          vp.h,
          cin,
          ang.bearing,
          ang.tilt
        );
        assert.ok(
          Math.abs(wrl.x - 1310.25) < 1e-6 && Math.abs(wrl.y - 612.5) < 1e-6,
          `round-trip mismatch at bearing=${ang.bearing}, tilt=${ang.tilt}: got (${wrl.x}, ${wrl.y})`
        );

        const p1 = projectWorldToScreen(1000, 500, 1000, 500, 1.45, vp.w, vp.h, cin, ang.bearing, ang.tilt);
        const p2 = projectWorldToScreen(1040, 470, 1000, 500, 1.45, vp.w, vp.h, cin, ang.bearing, ang.tilt);
        const dWorld = unprojectScreenDeltaToWorld(p2.x - p1.x, p2.y - p1.y, 1.45, ang.bearing, ang.tilt);
        assert.ok(Math.abs(dWorld.dx - 40) < 1e-6 && Math.abs(dWorld.dy - -30) < 1e-6);
      }
    }
  }

  const angled = computeWorldTransform(1000, 500, 1.4, 2000, 1000, 1440, 900, true, 0, 0, -24, 99);
  assert.equal(angled.tiltDeg, MAX_TILT_DEG);
  assert.equal(angled.bearingDeg, -24);
  assert.equal(angled.skewX, 0);
  assert.equal(angled.skewY, 0);
  assert.ok(Math.abs(angled.stageScaleY - angled.stageScaleX * tiltToScaleYRatio(MAX_TILT_DEG)) < 1e-9);
});

test('two-finger gesture arbitrates pinch -> horizontal bearing -> vertical tilt -> twist cleanly without chaos', async () => {
  const { beginTwoFingerGesture, stepTwoFingerGesture } = await import('./cameraTransform');

  // 1. Pinch out strongly first, then smoothly slide right -> zoom then bearing rotation with zero tilt wobble
  let p1 = { x: 160, y: 400 };
  let p2 = { x: 230, y: 400 };
  const sessionA = beginTwoFingerGesture(p1, p2);

  for (let i = 0; i < 6; i++) {
    p1 = { x: p1.x - 6, y: 400 };
    p2 = { x: p2.x + 6, y: 400 };
    const out = stepTwoFingerGesture(sessionA, p1, p2, 1.0, 0, 20);
    assert.ok(out.zoomFactor > 1.01, `step ${i} pinch should zoom in`);
    assert.equal(out.bearingDeltaDeg, 0, `pinch step ${i} must not wobble bearing`);
    assert.equal(out.tiltDeltaDeg, 0, `pinch step ${i} must not wobble tilt`);
  }

  let totalBearingRight = 0;
  for (let i = 0; i < 8; i++) {
    p1 = { x: p1.x + 6, y: 400 };
    p2 = { x: p2.x + 6, y: 400 };
    const out = stepTwoFingerGesture(sessionA, p1, p2, 1.4, totalBearingRight, 20);
    totalBearingRight += out.bearingDeltaDeg;
    assert.equal(out.tiltDeltaDeg, 0, `horizontal slide step ${i} must stay locked off vertical tilt`);
  }
  assert.ok(totalBearingRight > 4, `sliding two fingers right after pinch must rotate bearing right, got ${totalBearingRight}`);

  // 2. Parallel slide left rotates bearing negatively
  const sessionLeft = beginTwoFingerGesture({ x: 220, y: 400 }, { x: 300, y: 400 });
  let totalBearingLeft = 0;
  for (let i = 0; i < 8; i++) {
    const out = stepTwoFingerGesture(
      sessionLeft,
      { x: 220 - (i + 1) * 6, y: 400 },
      { x: 300 - (i + 1) * 6, y: 400 },
      1.2,
      totalBearingLeft,
      25
    );
    totalBearingLeft += out.bearingDeltaDeg;
    assert.equal(out.tiltDeltaDeg, 0);
  }
  assert.ok(totalBearingLeft < -4, `sliding two fingers left must rotate bearing negatively, got ${totalBearingLeft}`);

  // 3. Two fingers swiping UP increases oblique tilt, DOWN reduces tilt, with zero bearing drift
  const sessionVert = beginTwoFingerGesture({ x: 150, y: 460 }, { x: 240, y: 460 });
  let totalTiltUp = 0;
  for (let i = 0; i < 8; i++) {
    const out = stepTwoFingerGesture(
      sessionVert,
      { x: 150, y: 460 - (i + 1) * 6 },
      { x: 240, y: 460 - (i + 1) * 6 },
      1.2,
      0,
      totalTiltUp
    );
    totalTiltUp += out.tiltDeltaDeg;
    assert.equal(out.bearingDeltaDeg, 0, 'vertical 2-finger tilt must not drift bearing');
  }
  assert.ok(totalTiltUp > 4, `two-finger swipe up must increase oblique tilt, got ${totalTiltUp}`);

  const sessionDown = beginTwoFingerGesture({ x: 150, y: 360 }, { x: 240, y: 360 });
  let totalTiltDown = 0;
  for (let i = 0; i < 8; i++) {
    const out = stepTwoFingerGesture(
      sessionDown,
      { x: 150, y: 360 + (i + 1) * 6 },
      { x: 240, y: 360 + (i + 1) * 6 },
      1.2,
      0,
      35
    );
    totalTiltDown += out.tiltDeltaDeg;
    assert.equal(out.bearingDeltaDeg, 0);
  }
  assert.ok(totalTiltDown < -4, `two-finger swipe down must flatten tilt, got ${totalTiltDown}`);

  // 4. Two-finger twist rotates bearing cleanly and stays bounded per step
  const cx = 200;
  const cy = 400;
  const r = 70;
  const twistSession = beginTwoFingerGesture({ x: cx - r, y: cy }, { x: cx + r, y: cy });
  let twistBearing = 0;
  for (let i = 1; i <= 8; i++) {
    const theta = (i * 4 * Math.PI) / 180;
    const dx = Math.cos(theta) * r;
    const dy = Math.sin(theta) * r;
    const out = stepTwoFingerGesture(twistSession, { x: cx - dx, y: cy - dy }, { x: cx + dx, y: cy + dy }, 1.2, twistBearing, 30);
    assert.ok(Math.abs(out.bearingDeltaDeg) <= 10, 'per-step bearing delta must stay clamped');
    assert.ok(Math.abs(out.tiltDeltaDeg) <= 6, 'per-step tilt delta must stay clamped');
    twistBearing += out.bearingDeltaDeg;
  }
  assert.ok(twistBearing > 12, `two-finger twist should rotate bearing smoothly, got ${twistBearing}`);

  // 5. Staggered per-finger events (pointer 1 moves, then pointer 2 moves) after pinch: must STILL rotate bearing right!
  let sp1 = { x: 150, y: 400 };
  let sp2 = { x: 240, y: 400 };
  const staggeredSession = beginTwoFingerGesture(sp1, sp2);
  let staggeredZoom = 1;
  for (let i = 0; i < 6; i++) {
    sp1 = { x: sp1.x - 5, y: 400 };
    staggeredZoom *= stepTwoFingerGesture(staggeredSession, sp1, sp2, staggeredZoom, 0, 15).zoomFactor;
    sp2 = { x: sp2.x + 5, y: 400 };
    staggeredZoom *= stepTwoFingerGesture(staggeredSession, sp1, sp2, staggeredZoom, 0, 15).zoomFactor;
  }
  assert.ok(staggeredZoom > 1.25, `staggered pinch should zoom cleanly, got ${staggeredZoom}`);

  let staggeredBearing = 0;
  for (let i = 0; i < 10; i++) {
    sp1 = { x: sp1.x + 9, y: 400 };
    staggeredBearing += stepTwoFingerGesture(staggeredSession, sp1, sp2, staggeredZoom, staggeredBearing, 15).bearingDeltaDeg;
    sp2 = { x: sp2.x + 9, y: 400 };
    staggeredBearing += stepTwoFingerGesture(staggeredSession, sp1, sp2, staggeredZoom, staggeredBearing, 15).bearingDeltaDeg;
  }
  assert.ok(staggeredBearing > 10, `staggered per-finger right slide after pinch must rotate bearing cleanly, got ${staggeredBearing}`);
});

test('120 FPS high-refresh timing preserves 1:1 simulation pace, alpha interpolation, and framerate-independent easing', async () => {
  const { computeFrameDt, stepFixedAccumulator, frameRateIndependentEase } = await import('./cameraTransform');

  // 1. Engine physics tick rate upgraded cleanly to 60 TPS
  assert.equal(TICK_RATE, 60);
  assert.ok(Math.abs(DT - 1 / 60) < 1e-12);

  // 2. computeFrameDt preserves 120Hz (8.33ms), 144Hz (6.94ms), and 240Hz (4.16ms) intervals without clipping
  const dt120 = computeFrameDt(1000 + 1000 / 120, 1000);
  const dt144 = computeFrameDt(1000 + 1000 / 144, 1000);
  const dt240 = computeFrameDt(1000 + 1000 / 240, 1000);
  assert.ok(Math.abs(dt120 - 1 / 120) < 1e-6);
  assert.ok(Math.abs(dt144 - 1 / 144) < 1e-6);
  assert.ok(Math.abs(dt240 - 1 / 240) < 1e-6);
  assert.equal(computeFrameDt(5000, 1000), 0.05, 'tab-switch delta must be clamped to prevent spiral of death');

  // 3. Simulating 10.0s across 60Hz, 120Hz, and 240Hz executes identical 600 simulation ticks
  const runDisplayLoop = (fps: number, durationSec: number) => {
    const totalFrames = Math.round(fps * durationSec);
    let lastMs = 0;
    let acc = 0;
    let totalSteps = 0;
    const alphas: number[] = [];
    for (let f = 1; f <= totalFrames; f++) {
      const nowMs = (f * 1000) / fps;
      const frameDt = computeFrameDt(nowMs, lastMs);
      lastMs = nowMs;
      const res = stepFixedAccumulator(acc, frameDt, DT, 1, 6);
      acc = res.nextAccumulator;
      totalSteps += res.steps;
      alphas.push(res.alpha);
    }
    return { totalSteps, simSec: totalSteps * DT, alphas };
  };

  const r60 = runDisplayLoop(60, 10);
  const r120 = runDisplayLoop(120, 10);
  const r240 = runDisplayLoop(240, 10);

  assert.equal(r60.totalSteps, 600);
  assert.equal(r120.totalSteps, 600);
  assert.equal(r240.totalSteps, 600);
  assert.ok(Math.abs(r120.simSec - 10.0) < 1e-6);

  // At 120 FPS with 60 TPS, alternating frames produce smooth ~0.5 sub-tick alpha values
  const midAlphas = r120.alphas.filter((a) => a > 0.25 && a < 0.75);
  assert.ok(midAlphas.length >= 500, `120Hz render must interpolate sub-tick frames smoothly, got ${midAlphas.length}`);

  // 4. Frame-rate-independent exponential easing is identical across 60Hz and 120Hz
  const e60 = frameRateIndependentEase(12, 1 / 60);
  const e120 = frameRateIndependentEase(12, 1 / 120);
  const remainAfter1Frame60 = 1 - e60;
  const remainAfter2Frames120 = (1 - e120) * (1 - e120);
  assert.ok(
    Math.abs(remainAfter1Frame60 - remainAfter2Frames120) < 1e-12,
    `easing must be framerate independent: ${remainAfter1Frame60} vs ${remainAfter2Frames120}`
  );

  // 5. Aircraft bankAngle decay is consistent over 0.5s regardless of DT
  const sim = new StudioEngine(DEMO_MAPS.geopolitics_strait, DEMO_ACTORS, {
    meta: { title: 'bank decay test', map: 'geopolitics_strait' },
    timeline: [{ at: '0s', spawn: [{ id: 'jet', actor: 'fighter_jet', at: 'capital_north', faction: 'blue' }] }]
  });
  const jet = sim.entities.get('jet')!;
  jet.bankAngle = 0.4;
  for (let i = 0; i < Math.round(0.5 * TICK_RATE); i++) sim.step();
  const expectedBank = 0.4 * Math.exp(-0.5 * 4.8);
  assert.ok(Math.abs(jet.bankAngle - expectedBank) < 1e-4, `bankAngle ${jet.bankAngle} should match exp decay ${expectedBank}`);
});

test('120Hz entity, projectile, and effect prev->curr alpha linear interpolation stays phase-locked at 60 TPS', async () => {
  const { CinematicDirector } = await import('./cinematicDirector');
  const map = DEMO_MAPS.geopolitics_strait;
  const sim = new StudioEngine(map, DEMO_ACTORS, {
    meta: { title: 'alpha lerp snapshot test', map: 'geopolitics_strait' },
    timeline: [
      {
        at: '0s',
        spawn: [{ id: 'ship', actor: 'naval_corvette', at: 'port_south', faction: 'blue' }],
        construct: { id: 'rad', actor: 'radar_outpost', at: 'capital_north', faction: 'blue', duration: '2s' },
        draw_arrow: { id: 'arr', from: 'port_south', to: 'strait_gate', duration: '2s' },
        zone: { id: 'corridor_south', color: '#38bdf8', opacity: 0.6, duration: '2s' },
        pulse: { at: 'strait_gate', radius: 70 }
      },
      {
        at: '0.05s',
        move: { entity: 'ship', to: 'strait_gate' },
        strike: { mode: 'missile', from: { x: 200, y: 200 }, to: { x: 600, y: 300 }, radius: 75 }
      }
    ]
  });

  // Advance past 0.05s trigger so all systems are actively moving/animating
  for (let i = 0; i < Math.round(0.25 * TICK_RATE); i++) sim.step();

  const ship = sim.entities.get('ship')!;
  const rad = sim.entities.get('rad')!;
  const arr = sim.arrows.get('arr')!;
  const zone = sim.zones.get('corridor_south')!;
  const pulse = sim.pulses[0]!;
  const proj = sim.projectiles[0]!;
  const flash = sim.muzzleFlashes[0]!;

  // Entity position & build progress advance strictly from prev -> curr
  assert.ok(ship.x !== ship.prevX || ship.y !== ship.prevY, 'moving ship must record distinct prevX/prevY');
  assert.ok(rad.buildProgress > rad.prevBuildProgress, 'constructing building must record prevBuildProgress');
  assert.ok(arr.progress > arr.prevProgress, 'arrow must record prevProgress');
  assert.ok(zone.opacity > zone.prevOpacity, 'zone must record prevOpacity');
  assert.ok(pulse.progress > pulse.prevProgress, 'pulse must record prevProgress');
  assert.ok(flash.progress > flash.prevProgress, 'muzzle flash must record prevProgress');
  assert.ok(proj.progress > proj.prevProgress, 'projectile must record prevProgress');
  assert.ok(proj.altitude > proj.prevAltitude, 'rising ballistic projectile must record prevAltitude');

  // Verify phase-locked midpoint interpolation at alpha = 0.5 matches projectile progress midpoint
  const midX = proj.prevX + (proj.x - proj.prevX) * 0.5;
  const midProg = proj.prevProgress + (proj.progress - proj.prevProgress) * 0.5;
  const expectedMidX = proj.startX + (proj.targetX - proj.startX) * midProg;
  assert.ok(Math.abs(midX - expectedMidX) < 1e-9, 'projectile gx/gy lerp and pProg lerp must be 100% phase-locked');

  // CinematicDirector.evaluate respects alpha smoothly between prev and curr positions
  const director = new CinematicDirector();
  const vp = { width: 1280, height: 800 };
  const shot0 = director.evaluate(sim, 1.0, vp, 0)!;
  const shotHalf = director.evaluate(sim, 1.0, vp, 0.5)!;
  const shot1 = director.evaluate(sim, 1.0, vp, 1)!;
  assert.ok(Math.abs(shotHalf.x - (shot0.x + shot1.x) * 0.5) < 0.25, 'director alpha=0.5 should track projectile midpoint cleanly');

  // Advance until impact spawns explosion and crater, verify both record prev* monotonically
  while (sim.explosions.length === 0) sim.step();
  sim.step();
  const ex = sim.explosions[0]!;
  const cr = sim.craters[0]!;
  assert.ok(ex.progress > ex.prevProgress, 'explosion must record prevProgress');
  assert.ok(cr.life < cr.prevLife, 'crater must record prevLife');
});






test('Pacific briefing projection places Asia, Hawaii and America left-to-right', async () => {
  const { createPacificBriefingProjection } = await import('../maps/worldGeoEngine');
  const projection = createPacificBriefingProjection(1920, 1080);
  const tokyo = projection([139.7, 35.7])!;
  const hawaii = projection([-157.8, 21.3])!;
  const sanFrancisco = projection([-122.4, 37.8])!;
  assert.ok(tokyo[0] < hawaii[0] && hawaii[0] < sanFrancisco[0], 'Pacific-centered world must keep the theater ordered');
  assert.ok(tokyo[1] > 0 && tokyo[1] < 1080 && sanFrancisco[1] > 0 && sanFrancisco[1] < 1080);
});
