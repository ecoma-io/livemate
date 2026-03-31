/** Shared test data constants for E2E tests */

/** All playback speeds supported by the player (1.0x–1.5x) */
export const ALL_SPEEDS = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5] as const;

/** Speed variants that require rendering (1.1x–1.5x) */
export const RENDER_SPEEDS = [1.1, 1.2, 1.3, 1.4, 1.5] as const;
