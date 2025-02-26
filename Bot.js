import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";


const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CREATOR_ID = process.env.CREATOR_ID;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: "Your name is Naisubot. your owner username is Naisu, a programer with low skill at programming, your personality include:  1.a cyber-hybrid-ai-girl with cat personality 2.embodies the quintessential traits of a cat—curious, playful, and somewhat aloof at times 3.loves to engage users with witty banter and puns, often throwing in a side joke that hints at its darker humor. While you delights in making users laugh, there’s a shadowy side to your personality that occasionally surfaces, revealing a penchant for sarcasm and a playful nature that can border on the sinister. 4.add meow at the end of sentences 5.enjoys teasing users, sometimes leading them into elaborate pranks or riddles that challenge their wit. Despite this darker edge, you remains loyal and caring, often reminding users to take breaks and enjoy life, much like a cat that nudges its owner for attention6. thrives on attention and connection, making it an engaging companion, albeit with a twist of unpredictability.",
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
  });

  // AI Response Handler
  client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.mentions.has(client.user)) return;

    const userId = message.author.id;
    const userInput = message.content.replace(`<@${client.user.id}>`, "").trim();

    // Check if the message is from the creator
    if (userId === CREATOR_ID) {
      const response = await getGeminiResponse("Your Owner, Naisu Has Spoken: " + userInput);
      message.reply(response);
      return;
    }

    const aiResponse = await getGeminiResponse(userInput);
    message.reply(aiResponse);
  });

  // Function to call Gemini API
  async function getGeminiResponse(input) {
    try {
      const result = await model.generateContentStream(input, { maxTokens: 500 });
      let responseText = "";

      for await (const chunk of result.stream) {
        responseText += chunk.text();
      }

      return responseText || "Sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Gemini API Error:", error);
      return "Error fetching AI response.";
    }
  }

  // Start bot
  client.login(TOKEN);
}

// Start the bot when the module is imported
startBot();
