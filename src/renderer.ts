/// <reference types="youtube" />

import "./index.css";

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);

declare global {
  interface Window {
    electronAPI: {
      getNewVideo: () => Promise<void>;
    };
  }
}

const player = new YT.Player("player", {
  height: "390",
  width: "640",
  videoId: "dQw4w9WgXcQ",
  playerVars: {
    mute: 1,
  },
  events: {
    onReady: () => {
      player.playVideo();
    },
    onStateChange: async (event) => {
      if (event.data === YT.PlayerState.ENDED) {
        const response = await window.electronAPI.getNewVideo();
        console.log(response);
      }
    },
  },
});
