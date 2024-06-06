/// <reference types="youtube" />

import "./index.css";

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);

declare global {
  interface Window {
    electronAPI: {
      getVideo: () => Promise<string>;
    };
  }
}

(async () => {
  const videoId = await window.electronAPI.getVideo();
  const player = new YT.Player("player", {
    height: "390",
    width: "640",
    videoId,
    events: {
      onReady: () => {
        player.playVideo();
      },
      onStateChange: async (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          const newVideoId = await window.electronAPI.getVideo();
          player.loadVideoById(newVideoId);
        }
      },
    },
  });
})();
