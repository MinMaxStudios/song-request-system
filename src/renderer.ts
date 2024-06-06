/// <reference types="youtube" />

import "./index.css";

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);

declare global {
  interface Window {
    electronAPI: {
      sendEvent: (event: string) => void;
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
    onStateChange: (event) => {
      if (event.data === YT.PlayerState.ENDED) {
        window.electronAPI.sendEvent("video-ended");
      }
    },
  },
});
