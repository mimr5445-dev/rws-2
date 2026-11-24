import { MapPack } from '../core/types';

/** A free-placement board using the user-provided political world map image. */
export function buildWorldPoliticalBoard(): MapPack {
  // MapPack navigation grids require exact cell-aligned dimensions. The source
  // image is 736 × 530; 740 × 530 preserves its aspect ratio to within 0.5%.
  const width = 740;
  const height = 530;
  const cellSize = 10;
  const cols = width / cellSize;
  const rows = height / cellSize;

  return {
    id: 'world_political_board',
    title: 'خريطة العالم السياسية (صورة)',
    kind: 'tactical',
    width,
    height,
    cellSize,
    cols,
    rows,
    // This image is a visual board, not a georeferenced navigation map. Shared
    // cells keep free-play movement available for land and sea units alike.
    navGrid: Array<0 | 1 | 2 | 3>(cols * rows).fill(3),
    svgOrUrl: '/maps/world-political-board.jpg',
    unitScaleMultiplier: 0.32,
    anchors: {},
    zones: {}
  };
}
