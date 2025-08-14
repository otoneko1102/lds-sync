import {
  Client,
  Message,
  GatewayIntentBits,
  Partials,
  TextChannel,
} from "discord.js";
import { FilePayload } from "./lib/file";

const discordChannelId = process.env.DISCORD_CHANNEL_ID!;
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

export const initializeDiscordBot = (
  handler: (sender: string, content: string, files: string[]) => void
) => {
  discordClient.once("ready", () => {
    console.log(`Discord Bot logged in as ${discordClient.user?.tag}!`);
  });

  discordClient.on("messageCreate", async (message) => {
    if (message.channel.id !== discordChannelId || message.author.bot) {
      return;
    }

    const sender = message.member?.displayName ?? message.author.username;
    const content = message.content;
    const files = message.attachments.map((att) => att.url);

    handler(sender, content, files);
  });

  discordClient.login(process.env.DISCORD_BOT_TOKEN);
};

export const sendToDiscord = async (
  sender: string,
  content: string,
  platform: string,
  filePayload?: FilePayload
): Promise<Message | undefined> => {
  try {
    const channel = (await discordClient.channels.fetch(
      discordChannelId
    )) as TextChannel;
    if (!channel) return;

    const message = `${sender}[${platform}]:\n${content}`;

    if (filePayload) {
      return await channel.send({
        content: message,
        files: [
          {
            attachment: filePayload.buffer,
            name: filePayload.name,
          },
        ],
      });
    } else {
      return await channel.send({ content: message });
    }
  } catch (error) {
    console.error("Failed to send message to Discord:", error);
  }
};
