import "dotenv/config";
import axios from "axios";
import path from "path";
import { initializeLineBot, sendToLine } from "./line";
import { initializeDiscordBot, sendToDiscord } from "./discord";
import { initializeSlackBot, sendToSlack } from "./slack";
import { FilePayload } from "./lib/file";

console.log("LDS Sync Bot is starting...");

// Discordからのメッセージを中継
initializeDiscordBot(async (sender, content, files) => {
  const platform = "Discord";
  console.log(`[From ${platform}] ${sender}: ${content}`);

  if (files.length > 0) {
    for (const url of files) {
      try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data);
        const name =
          path.basename(new URL(url).pathname) || `from-discord-${Date.now()}`;

        await sendToSlack(sender, content, platform, { name, buffer });
      } catch (error) {
        console.error("Error handling file from Discord:", error);
      }
    }
  } else {
    await sendToSlack(sender, content, platform);
  }

  await sendToLine(sender, content, platform, files);
});

// Slackからのメッセージを中継
initializeSlackBot(async (sender, content, files) => {
  const platform = "Slack";
  console.log(`[From ${platform}] ${sender}: ${content}`);

  // LINEに送るための公開URLを格納する配列
  const publicFileUrlsForLine: string[] = [];

  if (files.length > 0) {
    for (const url of files) {
      try {
        // SlackのプライベートURLからBufferをダウンロード
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: { 'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}` }
        });
        const buffer = Buffer.from(response.data);
        const name = `from-slack-${Date.now()}.jpg`;

        const resultMessage = await sendToDiscord(sender, content, platform, { name, buffer });

        if (resultMessage && resultMessage.attachments.size > 0) {
          const discordAttachmentUrl = resultMessage.attachments.first()?.url;
          if (discordAttachmentUrl) {
            publicFileUrlsForLine.push(discordAttachmentUrl);
          }
        }
      } catch (error) {
        console.error("Error handling file from Slack:", error);
      }
    }
  } else {
    await sendToDiscord(sender, content, platform);
  }

  await sendToLine(sender, content, platform, publicFileUrlsForLine);
});

// LINEからのメッセージを中継
initializeLineBot((sender, content, filePayload?: FilePayload) => {
  const platform = "LINE";
  console.log(`[From ${platform}] ${sender}: ${content}`);
  sendToDiscord(sender, content, platform, filePayload);
  sendToSlack(sender, content, platform, filePayload);
});
