/// <reference types="youtube" />

import "./index.css";

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);

const player = new YT.Player("player", {
  height: "390",
  width: "640",
  videoId: "dQw4w9WgXcQ",
  events: {
    onReady: () => {
      player.playVideo();
    },
  },
});
