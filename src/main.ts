/* eslint-disable @typescript-eslint/no-non-null-assertion */
import "dotenv/config";

import { app, BrowserWindow, ipcMain } from "electron";
import { readFileSync, writeFileSync } from "node:fs";
import path from "path";
import { Masterchat, stringify } from "masterchat";

if (require("electron-squirrel-startup")) {
  app.quit();
}

let currentSong: {
  id: string;
  title: string;
} | null = null;
const songIds = JSON.parse(readFileSync("./songs.json", "utf-8"));
const queue = new Map<
  string,
  {
    title: string;
  }
>();
const cooldowns = new Set<string>();

function getRandomSong() {
  return songIds[Math.floor(Math.random() * songIds.length)];
}

async function getSongTitle(videoId: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`,
  );
  const data = await res.json();
  return data.items[0].snippet.title;
}

function parseSongTitle(title: string) {
  return title
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  mainWindow.webContents.openDevTools();

  ipcMain.handle("yt:get-video", async () => {
    return await getNextSong();
  });

  const mc = await Masterchat.init(process.env.YOUTUBE_STREAM_ID!, {
    credentials: process.env.YOUTUBE_BOT_CREDENTIALS!,
  });

  mc.on("chat", async (chat) => {
    const message = {
      content: stringify(chat.message),
      user: {
        id: chat.authorChannelId,
        name: chat.authorName,
        avatar: chat.authorPhoto,
      },
    };
    if (message.content.startsWith("!sr")) {
      if (cooldowns.has(message.user.id))
        return mc.sendMessage(
          `${message.user.name}, you're on cooldown. Request another song after the current song ends.`,
        );

      const searchQuery = message.content.split(" ").slice(1).join(" ");
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
          searchQuery,
        )}&maxResults=1&type=video&key=${process.env.YOUTUBE_API_KEY}`,
      );
      const data = await res.json();
      if (!data.items[0])
        return mc.sendMessage(
          `${message.user.name}, I couldn't find a video with that search query.`,
        );

      const video = data.items[0];
      const videoId = video.id.videoId;
      const title = parseSongTitle(video.snippet.title);
      queue.set(videoId, { title });
      mainWindow.webContents.send(
        "queue-updated",
        [...queue.entries()].map(([k, v]) => ({ id: k, title: v.title })),
      );
      cooldowns.add(message.user.id);

      mc.sendMessage(
        `${message.user.name}, ${title} has been added to the queue.`,
      );
    } else if (message.content === "!currentsong") {
      mc.sendMessage(`Currently playing: ${currentSong?.title}`);
    } else if (message.content === "!skip") {
      console.log(chat);
      if (!chat.isModerator && !chat.isOwner)
        return mc.sendMessage(
          `${message.user.name}, you are not authorized to skip songs.`,
        );
      mc.sendMessage(`${message.user.name}, skipped ${currentSong?.title}.`);
      const nextSong = await getNextSong();
      mainWindow.webContents.send("song-skipped", nextSong);
    }
  });

  mc.listen({ ignoreFirstResponse: true });

  async function getNextSong() {
    let videoId: string;
    let title: string;
    if (queue.size > 0) {
      const [queueEntry] = [...queue.entries()];
      videoId = queueEntry[0];
      title = queueEntry[1].title;
      queue.delete(videoId);
      mainWindow.webContents.send(
        "queue-updated",
        [...queue.entries()].map(([k, v]) => ({ id: k, title: v.title })),
      );
    } else {
      videoId = getRandomSong();
      title = await getSongTitle(videoId);
    }

    currentSong = { id: videoId, title };
    writeFileSync("current-song.txt", parseSongTitle(title));
    cooldowns.clear();
    return videoId;
  }
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
