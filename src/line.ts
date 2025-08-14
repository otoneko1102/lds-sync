import express from "express";
import {
  Client,
  middleware,
  WebhookEvent,
  MessageAPIResponseBase,
  Message,
} from "@line/bot-sdk";
import { FilePayload } from "./lib/file";

const lineGroupId = process.env.LINE_GROUP_ID!;
const config = {
  channelSecret: process.env.LINE_CHANNEL_SECRET!,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
};
const lineClient = new Client(config);

export const initializeLineBot = (
  handler: (sender: string, content: string, filePayload?: FilePayload) => void
) => {
  const app = express();

  const handleEvent = async (
    event: WebhookEvent
  ): Promise<MessageAPIResponseBase | undefined> => {
    if (event.source.type !== "group" || event.source.groupId !== lineGroupId) {
      return;
    }

    if (event.type === "message") {
      const profile = await lineClient.getGroupMemberProfile(
        event.source.groupId,
        event.source.userId!
      );
      const sender = profile.displayName;
      let content = "";

      if (event.message.type === "text") {
        content = event.message.text;
        handler(sender, content);
      } else if (event.message.type === "image") {
        const imageStream = await lineClient.getMessageContent(
          event.message.id
        );
        const chunks: Buffer[] = [];
        for await (const chunk of imageStream) {
          chunks.push(chunk);
        }
        const imageBuffer = Buffer.concat(chunks);

        const filePayload: FilePayload = {
          name: `${event.message.id}.jpg`,
          buffer: imageBuffer,
        };

        handler(sender, content, filePayload);
      }
    }
  };

  app.post("/webhook", middleware(config), (req, res) => {
    Promise.all(req.body.events.map(handleEvent))
      .then((result) => res.json(result))
      .catch((err) => {
        console.error(err);
        res.status(500).end();
      });
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(
      `LINE Bot listening on ${
        process.env?.LINE_WEBHOOK_DOMAIN
          ? `https://${process.env.LINE_WEBHOOK_DOMAIN}/webhook`
          : `http://localhost:${port}`
      }`
    );
  });
};

export const sendToLine = async (
  sender: string,
  content: string,
  platform: string,
  files: string[] = []
) => {
  try {
    const messageText = `${sender}[${platform}]:\n${content}`;
    const messages: Message[] = [{ type: "text", text: messageText }];

    if (files.length > 0) {
      for (const fileUrl of files) {
        // 画像の場合はURLではなくアップロードする
        if (/\.(jpg|jpeg|png|gif|webp)(?=\?|$)/i.test(fileUrl)) {
          messages.push({
            type: "image",
            originalContentUrl: fileUrl,
            previewImageUrl: fileUrl,
          });
        } else {
          messages.push({ type: "text", text: `添付ファイル: ${fileUrl}` });
        }
      }
    }

    if (messages.length > 0) {
      await lineClient.pushMessage(lineGroupId, messages);
    }
  } catch (error) {
    console.error("Failed to send message to LINE:", error);
  }
};
