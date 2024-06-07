/// <reference types="youtube" />

import "./index.css";

console.log(
  '👋 This message is being logged by "renderer.ts", included via Vite',
);

declare global {
  interface Window {
    electronAPI: {
      getVideo: () => Promise<{ id: string; title: string }>;
      onQueueUpdate: (
        callback: (queue: { id: string; title: string }[]) => void,
      ) => void;
      onSongSkipped: (
        callback: (video: { id: string; title: string }) => void,
      ) => void;
      showContextMenu: (videoId: string) => void;
    };
  }
}

let player: YT.Player;
(async () => {
  const video = await window.electronAPI.getVideo();
  updateSongTitle(video);
  player = new YT.Player("player", {
    width: "800",
    height: "300",
    videoId: video.id,
    playerVars: {
      showinfo: 0,
      controls: 0,
      autohide: 1,
      modestbranding: 1,
      rel: 0,
    },
    events: {
      onReady: () => {
        player.playVideo();
      },
      onStateChange: async (event) => {
        if (event.data === YT.PlayerState.ENDED) {
          const newVideo = await window.electronAPI.getVideo();
          updateSongTitle(newVideo);
          player.loadVideoById(newVideo.id);
        } else if (
          event.data === YT.PlayerState.PAUSED ||
          event.data === YT.PlayerState.PLAYING
        ) {
          const playPauseButton = document.getElementById("playpause");
          switch (event.data) {
            case YT.PlayerState.PAUSED:
              playPauseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-play"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;
              break;
            case YT.PlayerState.PLAYING:
              playPauseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-pause"><circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/></svg>`;
              break;
          }
        }
      },
    },
  });
})();

window.electronAPI.onQueueUpdate((queue) => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const queueElem = document.getElementById("queue")!;
  queueElem.innerHTML = "";
  if (!queue.length) {
    queueElem.innerText = "No songs in queue.";
  } else {
    for (let i = 0; i < queue.length; i++) {
      const song = queue[i];
      const songElem = document.createElement("div");
      songElem.className = "song";
      songElem.innerText = `${i + 1}. ${song.title}`;
      songElem.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.electronAPI.showContextMenu(song.id);
      });
      queueElem.appendChild(songElem);
    }
  }
});

window.electronAPI.onSongSkipped((video) => {
  player.loadVideoById(video.id);
  updateSongTitle(video);
});

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("skip")?.addEventListener("click", async () => {
    const newVideo = await window.electronAPI.getVideo();
    updateSongTitle(newVideo);
    player.loadVideoById(newVideo.id);
  });

  const playPauseButton = document.getElementById("playpause");
  playPauseButton?.addEventListener("click", async () => {
    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
      playPauseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-play"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;
    } else {
      player.playVideo();
      playPauseButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-pause"><circle cx="12" cy="12" r="10"/><line x1="10" x2="10" y1="15" y2="9"/><line x1="14" x2="14" y1="15" y2="9"/></svg>`;
    }
  });

  const volumeSlider = document.getElementById("volume") as HTMLInputElement;
  volumeSlider.addEventListener("input", (e) => {
    const newVolume = (e.target as HTMLInputElement).valueAsNumber;
    if (player.isMuted() && newVolume > 0) player.unMute();
    if (!player.isMuted() && newVolume === 0) player.mute();
    player.setVolume(newVolume);
  });

  const volumeButton = document.getElementById("volume-button");
  volumeButton?.addEventListener("click", () => {
    volumeSlider.valueAsNumber = !player.isMuted() ? 0 : player.getVolume();
    if (player.isMuted()) {
      player.unMute();
    } else {
      player.mute();
    }
  });
});

function updateSongTitle(video: { id: string; title: string }) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const currentSong = document.getElementById(
    "currentsong",
  ) as HTMLAnchorElement;
  currentSong.href = `https://youtube.com/watch?v=${video.id}`;
  currentSong.textContent = video.title;
}
