/// <reference types="youtube" />

import "./index.css";

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);

declare global {
  interface Window {
    electronAPI: {
      getVideo: () => Promise<string>;
      onQueueUpdate: (
        callback: (queue: { id: string; title: string }[]) => void,
      ) => void;
      onSongSkipped: (callback: (videoId: string) => void) => void;
    };
  }
}

let player: YT.Player;
(async () => {
  const videoId = await window.electronAPI.getVideo();
  player = new YT.Player("player", {
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

window.electronAPI.onQueueUpdate((queue) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  document.getElementById("queue")!.innerText =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    `Current Queue:\n${queue.map(({ title }: any, index: number) => `${index + 1}. ${title}`).join("\n")}`;
});

window.electronAPI.onSongSkipped((videoId) => {
  player.loadVideoById(videoId);
});
