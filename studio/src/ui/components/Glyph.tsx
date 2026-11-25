export type GlyphName =
  | 'play'
  | 'pause'
  | 'stop'
  | 'rewind'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'layers'
  | 'sliders'
  | 'timeline'
  | 'globe'
  | 'close'
  | 'language';

const PATHS: Record<GlyphName, string> = {
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
  stop: 'M6 6h12v12H6z',
  rewind: 'M11 6v12L2 12zM22 6v12l-9-6z',
  'zoom-in': 'M11 4a7 7 0 105.29 11.71l4 4 1.42-1.42-4-4A7 7 0 0011 4zm0 2v10M6 11h10',
  'zoom-out': 'M11 4a7 7 0 105.29 11.71l4 4 1.42-1.42-4-4A7 7 0 0011 4zM6 11h10',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  sliders: 'M5 6h14M5 12h14M5 18h14M9 4v4M15 10v4M7 16v4',
  timeline: 'M3 7h18M3 12h12M3 17h7',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 4 3 14 0 18-3-4-3-14 0-18z',
  close: 'M6 6l12 12M18 6L6 18',
  language: 'M4 5h10M9 5c0 6-3 9-5 10M6 9c1 3 4 6 8 7M13 19l4-10 4 10M14.5 16h5',
};

interface GlyphProps {
  name: GlyphName;
  className?: string;
}

export function Glyph({ name, className }: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className ?? 'size-5'}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
