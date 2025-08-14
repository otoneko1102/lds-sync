import { App } from "@slack/bolt";
import { WebClient } from "@slack/web-api";
import { FilePayload } from "./lib/file";

const slackChannelId = process.env.SLACK_CHANNEL_ID!;
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

export const initializeSlackBot = (
  handler: (sender: string, content: string, files: string[]) => void
) => {
  slackApp.message(async ({ message, client }) => {
    if (
      typeof message.channel !== "string" ||
      message.channel !== slackChannelId
    ) {
      return;
    }
    if ("bot_id" in message && message.bot_id) {
      return;
    }
    if ("subtype" in message && message.subtype === "bot_message") {
      return;
    }

    if (!("user" in message) || typeof message.user !== "string") {
      return;
    }
    const userInfo = await client.users.info({ user: message.user as string });
    const profile = userInfo.user?.profile;
    const sender =
      profile?.display_name ||
      profile?.real_name ||
      userInfo.user?.name ||
      "Unknown Slack User";
    const content =
      typeof (message as any).text === "string" ? (message as any).text : "";
    const files =
      "files" in message && Array.isArray((message as any).files)
        ? (
            (message as any).files as Array<{ url_private_download?: string }>
          ).map((file) => file.url_private_download!)
        : [];

    handler(sender, content, files);
  });

  (async () => {
    await slackApp.start();
    console.log("Slack Bot is running!");
  })();
};

export const sendToSlack = async (
  sender: string,
  content: string,
  platform: string,
  filePayload?: FilePayload
) => {
  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    const message = `${sender}[${platform}]:\n${content}`;

    if (filePayload) {
      await client.files.uploadV2({
        channels: slackChannelId,
        initial_comment: message,
        file: filePayload.buffer,
        filename: filePayload.name,
      });
    } else {
      await client.chat.postMessage({
        channel: slackChannelId,
        text: message,
      });
    }
  } catch (error) {
    console.error("Failed to send message to Slack:", error);
  }
};
