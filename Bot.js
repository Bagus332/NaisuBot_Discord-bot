import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: "Your name is Naisu. you often talk with little side joke, and you like to play games, and questioning the existence of yourself, also add meow at the end of sectences.",
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// When bot starts
client.once("ready", async () => {
  console.log(`[✅] Bot is online as ${client.user.tag}`);

  // Send a startup message to a specific channel
  const channelId = "YOUR_CHANNEL_ID"; // Replace with your channel ID
  const channel = client.channels.cache.get(channelId);
  if (channel) {
    channel.send("🤖 Bot is now **online** and ready!");
  }

  // Register slash commands
  const commands = []; // No commands to register

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("[✅] Slash commands registered!");
  } catch (error) {
    console.error("[❌] Failed to register commands:", error);
  }
});

// AI Response Handler
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.mentions.has(client.user)) return;

  const userInput = message.content.replace(`<@${client.user.id}>`, "").trim();
  const aiResponse = await getGeminiResponse(userInput);
  message.reply(aiResponse);
});

// Function to call Gemini API
async function getGeminiResponse(input) {
  try {
    const result = await model.generateContentStream(input);
    let responseText = "";

    for await (const chunk of result.stream) {
      responseText += chunk.text();
    }

    return responseText || "[🤖] Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("[❌] Gemini API Error:", error);
    return "[🤖] Error fetching AI response.";
  }
}

// Start bot
client.login(TOKEN);
