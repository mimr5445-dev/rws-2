# تراخيص الأصوات

جميع المقاطع في هذا المجلد **ملفات صوت حقيقية مسجّلة/مصمّمة** (وليست نغمات يولّدها الكود)،
ومرخّصة **CC0 1.0 Universal (الملك العام)** — يُسمح بالاستخدام والتعديل والتوزيع تجارياً بلا إسناد إلزامي.
الإسناد مذكور أدناه توثيقاً للمصدر فقط. الرخصة: https://creativecommons.org/publicdomain/zero/1.0/

## قواعد التسمية والربط

- اسم الملف = `اسم_الحدث_NN.ogg`، و`NN` رقم التنويع؛ يختار المشغّل تنويعاً عشوائياً عند كل تشغيل.
- أسماء الأحداث مطابقة تماماً لمعرّفات `SoundId` في `src/core/types.ts`، عدا `vehicles/tank_fire_01.ogg`
  المرتبط بالاسم المستعار `tank.fire` المستخدم في `content/units/tank_m1/unit.json`.
- `radar_ping` ليس له إدخال صريح في `manifest.json`: يُكتشف تلقائياً من اسم الملف في المتصفح
  عبر `soundDiscovery.ts`، ويبقى المولّد احتياطاً في محمّل Node/الاختبارات.
- كل المقاطع عولجت آلياً: تحويل إلى أحادي (mono)، ضبط الذروة إلى 0.85، تلاشٍ قصير عند البداية/النهاية،
  واقتطاع التسجيلات الطويلة (المشار إليه في العمود «ملاحظات»). البصمات الكاملة في `SHA256SUMS.txt`.

## المصادر (كلها CC0 1.0)

| الرمز | المصدر | المؤلف | الرابط الأصلي | مرآة/إثبات الرخصة |
|---|---|---|---|---|
| `OGA_STEPS` | Different Steps (TinyWorlds) — OpenGameArt | TinyWorlds | [الأصل](https://opengameart.org/content/different-steps-on-wood-stone-leaves-gravel-and-mud) | [المرآة](https://github.com/Mcamento8/open-game-sfx-index/tree/main/audio/oga-footsteps) |
| `KENNEY_RPG` | Kenney — RPG Audio | Kenney | [الأصل](https://kenney.nl/assets/rpg-audio) | [المرآة](https://github.com/Mcamento8/open-game-sfx-index/tree/main/audio/rpg-audio) |
| `KENNEY_IMPACT` | Kenney — Impact Sounds | Kenney | [الأصل](https://kenney.nl/assets/impact-sounds) | [المرآة](https://github.com/Mcamento8/open-game-sfx-index/tree/main/audio/impact-sounds) |
| `KENNEY_INTERFACE` | Kenney — Interface Sounds | Kenney | [الأصل](https://kenney.nl/assets/interface-sounds) | [المرآة](https://github.com/Mcamento8/open-game-sfx-index/tree/main/audio/interface-sounds) |
| `KENNEY_SCIFI` | Kenney — Sci-Fi Sounds | Kenney | [الأصل](https://kenney.nl/assets/sci-fi-sounds) | [المرآة](https://github.com/Mcamento8/open-game-sfx-index/tree/main/audio/sci-fi-sounds) |
| `OGA_BANG` | 25 CC0 bang / firework SFX — OpenGameArt | rubberduck | [الأصل](https://opengameart.org/content/25-cc0-bang-firework-sfx) | [المرآة](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/main/25-CC0-bang-sfx) |
| `OGA_100` | 100 CC0 SFX — OpenGameArt | rubberduck | [الأصل](https://opengameart.org/content/100-cc0-sfx) | [المرآة](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/main/100-CC0-SFX) |
| `OGA_100_V2` | 100 CC0 SFX #2 — OpenGameArt | rubberduck | [الأصل](https://opengameart.org/content/100-cc0-sfx-2) | [المرآة](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/main/100-cc0-sfx-2) |
| `OGA_SCIFI50` | 50 CC0 Sci-Fi SFX — OpenGameArt | rubberduck | [الأصل](https://opengameart.org/content/50-cc0-sci-fi-sfx) | [المرآة](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/main/50-cc0-sci-fi-sfx) |
| `OGA_WATER` | 40 CC0 water / splash / slime SFX — OpenGameArt | rubberduck | [الأصل](https://opengameart.org/content/40-cc0-water-splash-slime-sfx) | [المرآة](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/main/40-cc0-water-splash-slime-sfx) |
| `BB_FANS` | Micro Sample Pack — Fans and Drones (Jul 2021) | Benjamin Burnes (Abstraction) | [الأصل](https://ben-burnes.gumroad.com/l/MicroPacks2021) | [المرآة](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/tree/main/bb%20-%20Fans%20and%20Drones%20(Jul%202021)) |
| `STILL_NORTH` | The Free Firearm Sound Effects Library | Still North Media | [الأصل](https://www.stillnorthmedia.com/firearm-sound-library.html) | [المرآة](https://github.com/PanderMusubi/sound-effects-library-weapons/tree/master/samples) |
| `WP_PROPELLER` | Echo Propeller.wav — Freesound #260813 | iccleste | [الأصل](https://freesound.org/people/iccleste/sounds/260813/) | [المرآة](https://github.com/Wade-Yancey/War-Patrol/blob/main/packages/client/public/audio/CREDITS.txt) |
| `WP_SONAR` | Sonar.wav — Freesound #70299 | KIZILSUNGUR | [الأصل](https://freesound.org/people/KIZILSUNGUR/sounds/70299/) | [المرآة](https://github.com/Wade-Yancey/War-Patrol/blob/main/packages/client/public/audio/CREDITS.txt) |
| `WP_BELL` | Ship Bell Single Ring — Freesound #353233 | Sojan | [الأصل](https://freesound.org/people/Sojan/sounds/353233/) | [المرآة](https://github.com/Wade-Yancey/War-Patrol/blob/main/packages/client/public/audio/CREDITS.txt) |
| `TIDELOCK_HORN` | Their Coming (generic horn sound) — OpenGameArt | StumpyStrust | [الأصل](https://opengameart.org/content/their-coming-generic-horn-sound) | [المرآة](https://github.com/xoloteach/TIDELOCK/blob/main/ASSET_LICENSES.md) |
| `TIDELOCK_FOG` | Foghorn Kinda Gross — OpenGameArt | Musheran | [الأصل](https://opengameart.org/sites/default/files/foghorn_kinda_gross.mp3) | [المرآة](https://github.com/xoloteach/TIDELOCK/blob/main/ASSET_LICENSES.md) |

إثباتات إضافية: [فهرس الأصوات CC0](https://github.com/Mcamento8/open-game-sfx-index/blob/main/ATTRIBUTION.md)،
[رخصة مكتبة CC0-Public-Domain-Sounds](https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds/blob/main/LICENSE)،
[سجل War-Patrol](https://github.com/Wade-Yancey/War-Patrol/blob/main/packages/client/public/audio/CREDITS.txt)،
[سجل TIDELOCK](https://github.com/xoloteach/TIDELOCK/blob/main/ASSET_LICENSES.md).

## الملفات (37 ملفاً)

| الملف | الحدث في التطبيق | المصدر | المدة | الحجم | ملاحظات | SHA256 |
|---|---|---|---:|---:|---|---|
| `system/alert_ping_01.ogg` | `alert_ping` | `KENNEY_INTERFACE` | 0.10 ث | 4 ك.ب | — | `9270a3e65cd69c6213b0c302762eb56edb779f8a8e79c622393fa053dc30aef4` |
| `system/alert_ping_02.ogg` | `alert_ping` | `OGA_SCIFI50` | 0.41 ث | 6 ك.ب | — | `601489e0e439b492e0d07298757077a28ef8f7bd63c36a1fc31e7e144d6b266f` |
| `weapons/artillery_fire_01.ogg` | `artillery_fire` | `OGA_BANG` | 1.20 ث | 12 ك.ب | — | `a7103a11f0dd89d87d5b9b0580e55a0a0b5ba681123e51cef6bf27914895d850` |
| `weapons/artillery_fire_02.ogg` | `artillery_fire` | `OGA_BANG` | 1.11 ث | 12 ك.ب | — | `ffb8ccd5ed9d88a898a90a7daa16f88b43ec21c0b6a3f09b60d8ea3cb8c54b3b` |
| `system/build_complete_01.ogg` | `build_complete` | `WP_BELL` | 1.80 ث | 19 ك.ب | مقتطع من رنة جرس سفينة | `924ac5a5cd090e637d809ce15ffa4da5df4de85f7efee36ace795bc846e2a067` |
| `system/build_complete_02.ogg` | `build_complete` | `KENNEY_INTERFACE` | 0.29 ث | 4 ك.ب | — | `466c435f2cf4a9ab73380c2fe6d2b0e004e81aa138adf34494d3dbd036e6e5ca` |
| `weapons/cannon_fire_01.ogg` | `cannon_fire` | `OGA_BANG` | 1.24 ث | 13 ك.ب | — | `c731fde0654024f55ea0e18b94768c786bf12bb41de6768b40684d2e13cd0000` |
| `weapons/cannon_fire_02.ogg` | `cannon_fire` | `OGA_BANG` | 0.86 ث | 10 ك.ب | — | `afd6af63fa74d106ecd2b7ce72497b209c4d89cb66ec335c23936c46a7c5c918` |
| `weapons/explosion_01.ogg` | `explosion` | `OGA_BANG` | 1.03 ث | 10 ك.ب | — | `649f8dc9ac65b92efb966930a819e02c2ae1e98b75f21852d4bf35e26c2c2d31` |
| `weapons/explosion_02.ogg` | `explosion` | `OGA_BANG` | 1.11 ث | 10 ك.ب | — | `7cedf8a84df70e4f0dcead9004955c39572399cb659169c94fa93b164156d2a4` |
| `weapons/explosion_03.ogg` | `explosion` | `OGA_100` | 0.56 ث | 7 ك.ب | — | `750ce8abc9a686a5ba85a042fded12007559399d67190ef55447f15606979986` |
| `weapons/explosion_04.ogg` | `explosion` | `OGA_SCIFI50` | 1.84 ث | 13 ك.ب | — | `3472c57472480e95a3b0d65f8c550d51cfe6067b0a4995afa8112c1c3eab8c28` |
| `weapons/explosion_05.ogg` | `explosion` | `KENNEY_SCIFI` | 1.26 ث | 15 ك.ب | — | `80d04ee3e197bf6b71b87590b7912a2739c2b37503050234b1833eadc8878e0b` |
| `weapons/gunfire_burst_01.ogg` | `gunfire_burst` | `OGA_BANG` | 0.46 ث | 7 ك.ب | — | `dc79fb90d8079cf680045693455599b4b0dcea9fbee9e6c51515cfa0fdda1a9f` |
| `weapons/gunfire_burst_02.ogg` | `gunfire_burst` | `OGA_BANG` | 0.37 ث | 6 ك.ب | — | `a864a7b38df8cf00c9d12331f96237882e9ef1092f6b821602e89e4ad6524076` |
| `weapons/gunfire_burst_03.ogg` | `gunfire_burst` | `STILL_NORTH` | 1.30 ث | 18 ك.ب | مقتطع من تسجيل PPSh | `8daae09ed377564da565619ec21edf6595c025b3d1fa123b88c6d1daf0d37ebf` |
| `vehicles/jet_takeoff_01.ogg` | `jet_takeoff` | `BB_FANS` | 1.90 ث | 18 ك.ب | مقتطع من تسجيل مروحة كبيرة | `c1d4d9afb978add428443b15b1537490d18501e3c54f72c7433aac43362ec4a1` |
| `vehicles/jet_takeoff_02.ogg` | `jet_takeoff` | `KENNEY_SCIFI` | 1.70 ث | 12 ك.ب | مقتطع من حلقة محرك | `c49291147d82b00b8295a2881c5556468e6ba647f9d2831511d2339266e4fcc2` |
| `weapons/missile_launch_01.ogg` | `missile_launch` | `OGA_SCIFI50` | 2.05 ث | 13 ك.ب | — | `f04830e6993ab8415bba32ce806f99b7722eb20b406dad7d7a15622c678c26eb` |
| `weapons/missile_launch_02.ogg` | `missile_launch` | `KENNEY_SCIFI` | 1.60 ث | 19 ك.ب | مقتطع من حلقة محرك | `5b879bb06b2a11ebbf2e4d08d86076e8a974bf8049e5946dede343ec27f2a1aa` |
| `infantry/move_order_01.ogg` | `move_order` | `OGA_STEPS` | 0.29 ث | 6 ك.ب | — | `4259e817591f28227d5c5ce9ade906412309b019a631dbfa04c7e7c10ded512a` |
| `infantry/move_order_02.ogg` | `move_order` | `OGA_STEPS` | 0.70 ث | 11 ك.ب | — | `6c5e3e882052c40ba515511fc072b8164971b7789d61c39cf11e68807ab18ba9` |
| `infantry/move_order_03.ogg` | `move_order` | `OGA_STEPS` | 0.24 ث | 5 ك.ب | — | `d05cbd758ce215d17867ed0bc4db9a21a03683ecfd8cff7f15bffd03ac4cf61a` |
| `infantry/move_order_04.ogg` | `move_order` | `KENNEY_RPG` | 0.25 ث | 5 ك.ب | — | `bfb0599772da46228c398294599eec8de712aee6ea5f670779852d674e9db320` |
| `infantry/move_order_05.ogg` | `move_order` | `KENNEY_IMPACT` | 0.11 ث | 4 ك.ب | — | `cb113fed597e9e6d2b61984165a8c73eb3c9cfc8540ee506110e89f0e4078f0a` |
| `infantry/move_order_06.ogg` | `move_order` | `OGA_100_V2` | 0.42 ث | 5 ك.ب | — | `c1ce3be24637f1c72c63e27b98294ed5a75f03c008bfb2e379f43e3af2aee17e` |
| `infantry/move_order_07.ogg` | `move_order` | `OGA_100_V2` | 0.28 ث | 6 ك.ب | — | `6615f035fd0722dffa36d9c59c7592066012e4b2380dc204f1704a565383709a` |
| `system/radar_ping_01.ogg` | `radar_ping` | `WP_SONAR` | 2.74 ث | 13 ك.ب | — | `4cdd31f81d76f1597e1220509a1463533bce988ed7ee515d72aa12d4cbd5c497` |
| `system/radar_ping_02.ogg` | `radar_ping` | `OGA_SCIFI50` | 0.32 ث | 5 ك.ب | — | `8aa3d563748970e78c047908956d23530505d2ec565e9b1a586f14e0c3504571` |
| `naval/ship_horn_01.ogg` | `ship_horn` | `TIDELOCK_HORN` | 3.00 ث | 21 ك.ب | مقتطع من تسجيل بوق سفينة | `a0b3f88b868e680da46c3c0ceccfd749199263e32ec30085c3ce86ee3f6e6b7e` |
| `naval/ship_horn_02.ogg` | `ship_horn` | `TIDELOCK_FOG` | 2.80 ث | 9 ك.ب | مقتطع من تسجيل صفارة ضباب | `e3ed0299b2cccf60085596273bfffeeacdd499a80cd45e019601a1e80f95c0a1` |
| `system/spawn_pop_01.ogg` | `spawn_pop` | `KENNEY_INTERFACE` | 0.10 ث | 4 ك.ب | — | `ee6a29533059dc9186e124339ba79c0a735e232e4892acf4ad9d67a810ed713d` |
| `system/spawn_pop_02.ogg` | `spawn_pop` | `KENNEY_INTERFACE` | 0.11 ث | 4 ك.ب | — | `f34ac4f092fc444637c4c06b53da00e23fc6ede6bb5309c1e01426adb52c2269` |
| `vehicles/tank_fire_01.ogg` | `tank.fire` | `OGA_BANG` | 1.79 ث | 17 ك.ب | — | `fda9c6042729baaed48bfcd56db0c502f754a5cd059899e968cbf2f8d86a868a` |
| `naval/torpedo_launch_01.ogg` | `torpedo_launch` | `OGA_WATER` | 1.38 ث | 15 ك.ب | — | `fa7f3da288c9a9ad46310bae1fa0bfbcf9f4f571783b5cfe51ac4af6ac0fe6a9` |
| `naval/torpedo_launch_02.ogg` | `torpedo_launch` | `OGA_WATER` | 0.70 ث | 9 ك.ب | — | `d4d2dfe5c7e93975dbdc8d7ced88672c53b7d2d25700552cfe55939170c0a30e` |
| `naval/torpedo_launch_03.ogg` | `torpedo_launch` | `WP_PROPELLER` | 1.60 ث | 10 ك.ب | مقتطع من تسجيل مروحة/صدى تحت الماء | `c972a198c7143bb7b616eeb7c0cd0dbff85c07e6668090f3eaf08a6b4813cf29` |

## ما استُبدل

حُذفت الملفات القديمة التالية لأن ترخيصها غير موثّق أو لأنها مقاطع تجريبية مولّدة محلياً،
وحلّت محلّها المقاطع الموثّقة أعلاه:

- `missiles/ballistic_impact.mp3`
- `missiles/ballistic_impact_01.mp3`
- `missiles/rifle_shot.mp3`
- `vehicles/infantry_move.mp3`
- `vehicles/jet_takeoff.mp3`
- `vehicles/move_order.mp3`
- `vehicles/tank_fire_01.ogg` (كان مولّداً بـ ffmpeg بحجم 4 ك.ب) → استُبدل محتواه بتسجيل مدفعي CC0 مع الإبقاء على الاسم والمستوى 0.85.
