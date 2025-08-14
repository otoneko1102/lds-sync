/**
 * LINEのGroupIDを取得する開発用のスクリプト
 */
import "dotenv/config";
import express from "express";
import { middleware } from "@line/bot-sdk";

const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const PORT = process.env.PORT || 3000;

if (!lineConfig.channelSecret || !lineConfig.channelAccessToken) {
  console.error(
    "Error: LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN are not found in .env"
  );
  process.exit(1);
}

const app = express();

app.get('/', (req, res) => {
  res.send('Get LINE GroupID Script is running!\nWebhookEndPoint: /webhook-get-id');
});

app.post("/webhook-get-id", middleware(lineConfig), (req, res) => {
  console.log("\n\n==============================================");
  console.log("✅ Event!");
  console.log("==============================================");

  console.log("Data:", JSON.stringify(req.body, null, 2));

  const events = req.body.events;

  if (!events || events.length === 0) {
    console.log("Event Data is empty.");
    return res.status(200).send("OK");
  }

  for (const event of events) {
    if (event.source && event.source.groupId) {
      console.log(`\n🎉 GroupId:`);
      console.log(` -> ${event.source.groupId}`);
      console.log(`(Event type: ${event.type})`);
      break; // 終了
    }
  }

  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log("--------------------------------------------------");
  console.log(`Wake up: Get LINE GroupID Script`);
  console.log(`PORT: ${PORT}`);
  console.log("--------------------------------------------------");
  console.log("TO DO:");
  console.log(
    `1. LINE DevelopersコンソールのWebhook URLを一時的に変更:`
  );
  console.log(`https://${process.env?.LINE_WEBHOOK_DOMAIN || "example.com"}/webhook-get-id`);
  console.log(`2. 下記のいずれかのアクションを実行:`);
  console.log(`   a) IDを知りたいLINEグループにBotを招待`);
  console.log(
    `   b) Botが既に参加しているグループで、何かメッセージを送信`
  );
  console.log("--------------------------------------------------");
  console.log("Watching...");
});
