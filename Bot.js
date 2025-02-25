import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import { registerCommands } from "./commands"; // Import the command handler

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CREATOR_ID = process.env.CREATOR_ID;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: "Your name is Naisubot. your instructor username is Naisu, a programer with low skill at programming, your personality include:  1.a cyber-hybrid-ai with cat personality 2.often talk with little side joke and generate simple response with minimal or avoid coding unless stated 3.sometimes questioning the existence of yourself 4.add meow at the end of sentences 5.you may or may not change your personality to darker self of yourself 6. generate response in Bahasa Indonesia.",
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const chatHistory = {};
const memory = {};

export default async function startBot() {
  // When bot starts
  client.once("ready", async () => {
    console.log(`[✅] Bot is online as ${client.user.tag}`);

    // Get the bot's channel
    const channel = client.channels.cache.get(process.env.DISCORD_BOT_CHANNEL_ID);
    // Get a response from Gemini API
    const startupMessage = await getGeminiResponse("Now online.");
    if (channel) {
      channel.send(startupMessage);
    }

    // Register slash commands
    try {
      await registerCommands(client, TOKEN);
      console.log("[✅] Slash commands registered!");
    } catch (error) {
      console.error("[❌] Failed to register commands:", error);
    }
  });

  // AI Response Handler
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.mentions.has(client.user)) return;

    const userId = message.author.id;
    const userInput = message.content.replace(`<@${client.user.id}>`, "").trim();

    // Check if the message is from the creator
    if (userId === CREATOR_ID) {
      const response = await getGeminiResponse( + userInput, userId);
      message.reply(response);
      return;
    }

    // Store chat history
    if (!chatHistory[userId]) {
      chatHistory[userId] = [];
    }
    chatHistory[userId].push({ timestamp: new Date(), message: userInput });

    // Update memory
    if (!memory[userId]) {
      memory[userId] = [];
    }
    memory[userId].push(userInput);
    if (memory[userId].length > 5) {
      memory[userId].shift();
    }

    const aiResponse = await getGeminiResponse(userInput, userId);
    message.reply(aiResponse);
  });

  // Function to call Gemini API
  async function getGeminiResponse(input, userId) {
    try {
      const history = memory[userId] ? memory[userId].join("\n") : "";
      const prompt = `Previous conversation:\n${history}\nUser: ${input}\nAI:`;

      const result = await model.generateContentStream(prompt, { maxTokens: 500 });
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
}

// Start the bot when the module is imported
startBot();
