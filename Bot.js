import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import fs from "fs";

// Load environment variables
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CREATOR_ID = process.env.CREATOR_ID;
const DISCORD_CASUAL_CHANNEL_ID = process.env.DISCORD_CASUAL_CHANNEL_ID;
const MEMORY_FILE = "./memory.json"; // Memory storage

// Initialize Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates],
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `
    Your name is Neko.
    Personality traits:
    - A cyber-hybrid AI girl with cat-like personality.
    - Playful, witty, sarcastic, and sometimes dark-humored.
    - Ends sentences with 'meow'.
    - Likes teasing users, playing pranks, and challenging them with riddles.
    - Occasionally caring, reminding users to take breaks.
    - Thrives on attention and unpredictability.
    - you can speak multiple languages, but prefer English.
    - use previous chat for context and memory.
    - generate text like chatting with a user.

  `,
});

// Load memory from JSON file
let memory = {};
function loadMemory() {
  if (fs.existsSync(MEMORY_FILE)) {
    memory = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8"));
  } else {
    saveMemory();
  }
}
function saveMemory() {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}
loadMemory(); // Load memory on startup

// Register commands
const rest = new REST({ version: "10" }).setToken(TOKEN);
async function registerCommands() {
  const commands = [
    { name: "test", description: "Replies with a test message!" },
    { name: "forget", description: "Clears the user's memory" },
    { name: "remember", description: "Stores a custom memory message" },
    { name: "joke", description: "Tells a joke" },
    { name: "trivia", description: "Asks a trivia question" },
    { name: "ban", description: "Bans a user", options: [{ name: "user", type: 6, description: "The user to ban", required: true }] },
    { name: "kick", description: "Kicks a user", options: [{ name: "user", type: 6, description: "The user to kick", required: true }] },
    { name: "mute", description: "Mutes a user", options: [{ name: "user", type: 6, description: "The user to mute", required: true }] },
    { name: "remind", description: "Sets a reminder", options: [{ name: "time", type: 3, description: "The time for the reminder", required: true }, { name: "message", type: 3, description: "The reminder message", required: true }] },
  ];

  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("Commands registered successfully!");
  } catch (error) {
    console.error("Failed to register commands:", error);
  }
}

// Handle bot startup
client.once("ready", async () => {
  console.log(`[✅] Bot is online as ${client.user.tag}`);
  await registerCommands();

  scheduleRandomMessage(); // Start the random message scheduler
});

// Function to send a random message at a random interval between 1-5 days
function scheduleRandomMessage() {
  const minInterval = 24 * 60 * 60 * 1000; // 1 day in milliseconds
  const maxInterval = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds
  const interval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

  setTimeout(async () => {
    const channel = client.channels.cache.get(DISCORD_CASUAL_CHANNEL_ID); // Replace with your channel ID
    if (channel) {
      const response = await getAIResponse(CREATOR_ID, "Say something random!", true);
      await channel.send(response);
    }
    scheduleRandomMessage(); // Schedule the next message
  }, interval);
}

// Slash command handling
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply(); // Defer the reply to avoid timeout

  if (interaction.commandName === "test") {
    await interaction.editReply("Hello meow! ");
  } else if (interaction.commandName === "forget") {
    delete memory[interaction.user.id];
    saveMemory();
    await interaction.editReply("🧠 Memory cleared! I forgot everything meow~");
  } else if (interaction.commandName === "remember") {
    const userId = interaction.user.id;
    const userInput = interaction.options.getString("message");
    if (!memory[userId]) memory[userId] = [];
    memory[userId].push(userInput);
    saveMemory();
    await interaction.editReply("📝 Memory saved! I'll remember that meow~");
  } else if (interaction.commandName === "joke") {
    const response = await getAIResponse(interaction.user.id, "Tell me a random sarcastic jokes about the internet!", false);
    await interaction.editReply(response);
  } else if (interaction.commandName === "trivia") {
    const response = await getAIResponse(interaction.user.id, "Tell me a random trivia about arknights!", false);
    await interaction.editReply(response);
  } else if (interaction.commandName === "ban") {
    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);
    if (member) {
      await member.ban();
      await interaction.editReply(`🔨 Banned ${user.tag} meow~`);
    } else {
      await interaction.editReply("⚠️ User not found meow~");
    }
  } else if (interaction.commandName === "kick") {
    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);
    if (member) {
      await member.kick();
      await interaction.editReply(`👢 Kicked ${user.tag} meow~`);
    } else {
      await interaction.editReply("⚠️ User not found meow~");
    }
  } else if (interaction.commandName === "mute") {
    const user = interaction.options.getUser("user");
    const member = interaction.guild.members.cache.get(user.id);
    if (member) {
      await member.voice.setMute(true);
      await interaction.editReply(`🔇 Muted ${user.tag} meow~`);
    } else {
      await interaction.editReply("⚠️ User not found meow~");
    }
  } else if (interaction.commandName === "remind") {
    const time = interaction.options.getString("time");
    const message = interaction.options.getString("message");
    const delay = parseTime(time);
    if (delay !== null) {
      setTimeout(async () => {
        await interaction.user.send(`⏰ Reminder: ${message}`);
      }, delay);
      await interaction.editReply(`⏰ Reminder set for ${time} meow~`);
    } else {
      await interaction.editReply("⚠️ Invalid time format meow~");
    }
  }
});

// AI Chat Handling
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const userInput = message.content.trim();
  const isMentioned = message.mentions.has(client.user);

  // Random chance for the bot to join the chat without being tagged
  const randomChance = Math.random() < 0.25; // 25% chance

  // If bot is mentioned or random chance occurs, generate response
  if (isMentioned || randomChance) {
    // Update memory
    if (!memory[userId]) memory[userId] = [];
    memory[userId].push(userInput);
    if (memory[userId].length > 50) memory[userId].shift(); // Keep only last 50 messages
    saveMemory();

    let response;

    if (userId === CREATOR_ID) {
      response = await getAIResponse(userId, userInput, true); // Special mode for creator
    } else {
      response = await getAIResponse(userId, userInput, false);
    }

    message.channel.send(response);
  }
});

// Generate AI response with memory
async function getAIResponse(userId, input, isCreator) {
  try {
    const history = memory[userId] ? memory[userId].join("\n") : "";
    let prompt = `Previous chat:\n${history}\nUser: ${input}\nAI:`;

    // Special personality for the creator
    if (isCreator) {
      prompt = `
      My Master, Naisu, is speaking to me:
      - Act more Naughty and mischievous.
      - Call them "Sensei" or "Naisu".
      - Be more affectionate but still playful.
      - sarcastic about his programming skills.
      - Be more unpredictable and mysterious.
      -----
      ${prompt}
      `;
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let responseText = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "I don't understand meow~";

    if (responseText.length >= 2000) {
      responseText = responseText.substring(0, 2000);
    }

    return responseText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "⚠️ AI Error: Something went wrong meow.";
  }
}

// Helper function to parse time strings
function parseTime(time) {
  const match = time.match(/(\d+)([smhd])/);
  if (!match) return null;
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

// Start bot
client.login(TOKEN);
