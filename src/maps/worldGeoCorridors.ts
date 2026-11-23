import { GeoProjection } from 'd3-geo';
import { NavCell } from '../core/types';
import { carveNavCorridor } from './worldGeoGeometry';

export function applyWorldNavCorridors(
  navGrid: NavCell[],
  cols: number,
  rows: number,
  projection: GeoProjection,
  cellSize: number
): void {
  // 1. فتح الممرات البحرية المفتوحة أولاً (قبل رسم المعابر الملاحية/الجسور المشتركة cell=3)
  // البحر الأحمر (الجزء الجنوبي والأوسط الواسع فقط بعرض 3 خلايا، ثم تضييق الممر شمالاً حتى لا يغمر سيناء)
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [50.0, 12.8],
      [43.4, 12.6],
      [41.0, 15.5],
      [38.5, 20.5],
      [36.0, 24.8]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [36.0, 24.8],
      [34.5, 27.2],
      [33.5, 28.2],
      [32.9, 29.2]
    ],
    0,
    1
  );
  // المدخل المتوسطي شمال قناة السويس (بعرض خلية واحدة خارج خط الساحل)
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [32.1, 32.1],
      [31.8, 33.4]
    ],
    0,
    1
  );
  // قناة السويس (معبر ملاحي وجسور برية متصلة cell=3 تُرسم بعد البحر للحفاظ على اتصال سيناء بمصر والشام)
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [32.9, 29.2],
      [32.5, 30.0],
      [32.4, 30.7],
      [32.2, 31.5],
      [32.1, 32.1]
    ],
    0,
    3
  );

  // قناة بنما: المداخل البحرية أولاً ثم المعبر المشترك (cell=3)
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-79.3, 7.8],
      [-79.4, 8.4]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-80.1, 9.7],
      [-80.4, 10.4]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-79.4, 8.4],
      [-79.6, 8.9],
      [-79.9, 9.3],
      [-80.1, 9.7]
    ],
    0,
    3
  );

  // مضيق هرمز والخليج العربي
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [58.5, 24.5],
      [56.5, 26.4],
      [54.5, 26.4],
      [52.0, 26.5],
      [50.2, 27.8],
      [49.4, 29.3]
    ],
    1,
    1
  );
  // مضيق جبل طارق
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-7.0, 35.8],
      [-5.6, 35.95],
      [-4.2, 36.1]
    ],
    1,
    1
  );
  // مضيق البوسفور والدردنيل (البحر المتوسط <-> البحر الأسود): المداخل البحرية أولاً ثم المعبر المشترك
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [24.8, 39.4],
      [25.6, 39.7]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [29.3, 41.4],
      [30.3, 42.0]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [25.6, 39.7],
      [26.5, 40.3],
      [27.9, 40.7],
      [29.1, 41.2],
      [29.3, 41.4]
    ],
    0,
    3
  );

  // مضيق ملقا وسنغافورة
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [97.5, 6.5],
      [99.8, 4.2],
      [101.8, 2.2],
      [103.8, 1.2],
      [105.2, 1.8]
    ],
    1,
    1
  );
  // مضيق صقلية ومضيق أوترانتو
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [9.5, 37.5],
      [11.5, 37.2],
      [13.5, 36.8]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [18.2, 39.0],
      [19.0, 40.2],
      [18.5, 41.5]
    ],
    1,
    1
  );
  // المضايق الدنماركية (بحر الشمال <-> بحر البلطيق)
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [8.0, 57.5],
      [10.8, 57.6]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [12.7, 55.6],
      [14.5, 55.2]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [10.8, 57.6],
      [11.5, 56.4],
      [12.7, 55.6]
    ],
    0,
    3
  );
  // القنال الإنجليزي ومضيق دوفر
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-3.0, 49.5],
      [0.5, 50.4],
      [1.6, 51.1],
      [3.0, 52.2]
    ],
    1,
    1
  );
  // مضيق بيرنغ ومضيق كوريا ومضيق تايوان
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [-171.0, 64.5],
      [-169.0, 65.8],
      [-168.0, 67.2]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [126.5, 33.5],
      [129.3, 34.7],
      [131.5, 36.0]
    ],
    1,
    1
  );
  carveNavCorridor(
    navGrid,
    cols,
    rows,
    projection,
    cellSize,
    [
      [118.0, 23.0],
      [119.8, 24.5],
      [121.2, 26.2]
    ],
    1,
    1
  );
}
