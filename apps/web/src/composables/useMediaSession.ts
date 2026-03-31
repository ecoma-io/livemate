import { onMounted } from 'vue';

export function useMediaSession(onToggle: () => void) {
  onMounted(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'LiveMate Studio',
      artist: 'LiveMate',
      album: 'The Show',
      artwork: [{ src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
    });
    navigator.mediaSession.setActionHandler('play', onToggle);
    navigator.mediaSession.setActionHandler('pause', onToggle);
  });
}
