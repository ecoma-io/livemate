export const SPEEDS = [
  { value: 1.0, label: '1.0x' },
  { value: 1.1, label: '1.1x' },
  { value: 1.2, label: '1.2x' },
  { value: 1.3, label: '1.3x' },
  { value: 1.4, label: '1.4x' },
  { value: 1.5, label: '1.5x' },
];

export type Speed = (typeof SPEEDS)[number]['value'];

// Speeds that need to be rendered (excluding base 1.0x)
export const RENDER_SPEEDS = SPEEDS.filter((s) => s.value !== 1.0).map((s) => s.value);
