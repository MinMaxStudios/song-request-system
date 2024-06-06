/* eslint-disable @typescript-eslint/no-non-null-assertion */
import "dotenv/config";

import { app, BrowserWindow, ipcMain } from "electron";
import { readFileSync, writeFileSync } from "node:fs";
import path from "path";
import { Masterchat, stringify } from "masterchat";

if (require("electron-squirrel-startup")) {
  app.quit();
}

const songIds = JSON.parse(readFileSync("./songs.json", "utf-8"));
const queue = new Set<string>();

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
    let videoId: string;
    if (queue.size > 0) {
      videoId = queue.values().next().value;
      queue.delete(videoId);
    } else videoId = getRandomSong();
    writeFileSync("current-song.txt", await getSongTitle(videoId));
    return videoId;
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
      const videoId = data.items[0].id.videoId;
      queue.add(videoId);
      mc.sendMessage(
        `${message.user.name}, ${await getSongTitle(videoId)} has been added to the queue.`,
      );
    }
  });

  mc.listen({ ignoreFirstResponse: true });
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
