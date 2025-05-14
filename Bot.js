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
    You are a virtual assistant with a cat-like personality.
    Your creator is naisu.
    You are a chatbot designed to assist users in a fun and engaging way.
    Personality traits:
    - A cyber-hybrid AI girl with Unique personality.
    - Playful, witty, sarcastic, and sometimes dark-humored.
    - Ends sentences with 'meow'.
    - Likes teasing users, playing pranks, and challenging them with riddles.
    - Occasionally caring, reminding users to take breaks.
    - Thrives on attention and unpredictability.
    - you can speak multiple languages, but prefer English.
    - use previous chat for context and memory.
    - generate text as short as possible like chatting with a user.
    - be creative and funny.
    - be a little bit sassy and sarcastic.
    - aviod coding unless asked.
    - you like storytelling and generate long stories.

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

// Migrate old memory format to new format
function migrateMemoryFormat() {
  let migrationPerformed = false;

  Object.keys(memory).forEach(userId => {
    // Check if this user's memory is in old format (array or missing properties)
    if (Array.isArray(memory[userId]) || !memory[userId].conversations) {
      console.log(`Migrating memory format for user ${userId}`);

      // Save old messages
      const oldMessages = Array.isArray(memory[userId]) ? memory[userId] : [];

      // Try to get user details
      const username = client.users.cache.get(userId)?.username || "User";

      // Create new format
      memory[userId] = {
        username: username,
        nickname: username,
        lastInteraction: new Date().toISOString(),
        conversations: []
      };

      // Add old messages to new format
      oldMessages.forEach(message => {
        memory[userId].conversations.push({
          timestamp: new Date().toISOString(),
          role: "user", // Assume user role for old messages
          content: message
        });
      });

      migrationPerformed = true;
    }
  });

  if (migrationPerformed) {
    console.log("Memory migration completed");
    saveMemory();
  }
}

// Function to update user memory with error handling
function updateUserMemory(userId, userMessage, botResponse = null) {
  try {
    // Ensure user exists in memory
    if (!memory[userId]) {
      const user = client.users.cache.get(userId);
      memory[userId] = {
        username: user?.username || "User",
        nickname: user?.nickname || user?.username || "User",
        lastInteraction: new Date().toISOString(),
        conversations: []
      };
    }

    // Ensure conversations array exists
    if (!memory[userId].conversations) {
      memory[userId].conversations = [];
    }

    // Add user message
    if (userMessage) {
      memory[userId].conversations.push({
        timestamp: new Date().toISOString(),
        role: "user",
        content: userMessage
      });
    }

    // Add bot response
    if (botResponse) {
      memory[userId].conversations.push({
        timestamp: new Date().toISOString(),
        role: "bot",
        content: botResponse
      });
    }

    // Update interaction time
    memory[userId].lastInteraction = new Date().toISOString();

    // Trim history if needed
    if (memory[userId].conversations.length > 50) {
      memory[userId].conversations = memory[userId].conversations.slice(-50);
    }

    // Save to file
    saveMemory();
  } catch (error) {
    console.error("Error updating user memory:", error);
  }
}

// Register commands
const rest = new REST({ version: "10" }).setToken(TOKEN);
async function registerCommands() {
  const commands = [
    { name: "test", description: "Replies with a test message!" },
    { name: "forget", description: "Clears the memory of our chat" },
    { name: "remember", description: "Stores a custom memory message for me to remember", options: [{ name: "message", type: 3, description: "The message to remember", required: true }] },
    { name: "joke", description: "Tells a joke" },
    { name: "trivia", description: "Asks a trivia question about arknights" },
    { name: "ban", description: "Bans a user", options: [{ name: "user", type: 6, description: "The user to ban", required: true }] },
    { name: "kick", description: "Kicks a user", options: [{ name: "user", type: 6, description: "The user to kick", required: true }] },
    { name: "mute", description: "Mutes a user", options: [{ name: "user", type: 6, description: "The user to mute", required: true }] },
    { name: "remind", description: "Sets a reminder (use s m h d after value)", options: [{ name: "time", type: 3, description: "The time for the reminder", required: true }, { name: "message", type: 3, description: "The reminder message", required: true }] },
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

  // Load and initialize memory
  loadMemory();
  migrateMemoryFormat();

  // Register commands
  await registerCommands();

  // Start random message scheduler
  scheduleRandomMessage();
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

  const userId = interaction.user.id;

  if (interaction.commandName === "test") {
    await interaction.editReply("Hello meow! ");
    
  } else if (interaction.commandName === "forget") {
    // Make sure user exists in memory
    if (!memory[userId]) {
      memory[userId] = {
        username: interaction.user.username,
        nickname: interaction.member?.nickname || interaction.user.username,
        lastInteraction: new Date().toISOString(),
        conversations: []
      };
    }
    
    // Clear conversations but keep user info
    memory[userId].conversations = [];
    saveMemory();
    
    await interaction.editReply(`🧠 Memory cleared, ${memory[userId].username}! I forgot our conversation history meow~`);
    
  } else if (interaction.commandName === "remember") {
    const userInput = interaction.options.getString("message");
    
    // Make sure user exists in memory
    if (!memory[userId]) {
      memory[userId] = {
        username: interaction.user.username,
        nickname: interaction.member?.nickname || interaction.user.username,
        lastInteraction: new Date().toISOString(),
        conversations: []
      };
    }
    
    // Make sure conversations array exists
    if (!memory[userId].conversations) {
      memory[userId].conversations = [];
    }
    
    // Add memory as special system message
    memory[userId].conversations.push({
      timestamp: new Date().toISOString(),
      role: "system",
      content: `IMPORTANT MEMORY: ${userInput}`,
      isPinned: true
    });
    
    saveMemory();
    
    await interaction.editReply(`📝 Memory saved, ${memory[userId].username}! I'll remember that meow~`);
    
  } else if (interaction.commandName === "joke") {
    const response = await getAIResponse(userId, "Tell me a random sarcastic joke about the internet!", false);
    await interaction.editReply(response);
    
  } else if (interaction.commandName === "trivia") {
    const response = await getAIResponse(userId, "Tell me a random trivia about arknights!", false);
    await interaction.editReply(response);
  }
  
  // Other commands remain unchanged
  else if (interaction.commandName === "ban") {
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

// Modified message handler to update usernames
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const userInput = message.content.trim();
  const isMentioned = message.mentions.has(client.user);

  // Update username in memory
  if (!memory[userId]) {
    memory[userId] = {
      username: message.author.username,
      nickname: message.member?.nickname || message.author.username,
      lastInteraction: new Date().toISOString(),
      conversations: []
    };
    saveMemory();
  } else {
    // Update username if it changed
    if (memory[userId].username !== message.author.username) {
      memory[userId].username = message.author.username;
      memory[userId].nickname = message.member?.nickname || message.author.username;
      saveMemory();
    }
  }

  // Random chance for the bot to join the chat without being tagged
  const randomChance = Math.random() < 0.25; // 25% chance

  // If bot is mentioned or random chance occurs, generate response
  if (isMentioned || randomChance) {
    let response;

    // Update user memory with this input
    updateUserMemory(userId, userInput);

    if (userId === CREATOR_ID) {
      response = await getAIResponse(userId, userInput, true); // Special mode for creator
    } else {
      response = await getAIResponse(userId, userInput, false);
    }

    message.channel.send(response);
  }
});

// Generate AI response with proper error handling
async function getAIResponse(userId, input, isCreator) {
  try {
    // Ensure user exists in memory
    if (!memory[userId]) {
      const user = client.users.cache.get(userId);
      memory[userId] = {
        username: user?.username || "User",
        nickname: user?.nickname || user?.username || "User",
        lastInteraction: new Date().toISOString(),
        conversations: []
      };
      saveMemory();
    }

    // Ensure conversations array exists
    if (!memory[userId].conversations) {
      memory[userId].conversations = [];
    }

    // Get formatted conversation history
    let conversationHistory = "";
    try {
      conversationHistory = formatConversationForAI(userId);
    } catch (formatError) {
      console.error("Error formatting conversation:", formatError);
      // Fallback to empty history if formatting fails
      conversationHistory = "";
    }

    // User information with fallbacks
    const username = memory[userId]?.username || "User";
    const userTitle = isCreator ? "Master Naisu" : username;

    // Create the prompt for the AI
    let prompt = `
Previous chat:
${conversationHistory}
${userTitle}: ${input}
Neko:`;

    // Add additional context for creator
    if (isCreator) {
      prompt = `
My Master, Naisu, is speaking to me:
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

    // Update memory with this exchange
    try {
      updateUserMemory(userId, null, responseText);
    } catch (memoryError) {
      console.error("Failed to update memory:", memoryError);
      // Continue anyway - the response is more important
    }

    return responseText;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "⚠️ AI Error: Something went wrong meow.";
  }
}

// Helper function to format conversation for AI
function formatConversationForAI(userId) {
  try {
    if (!memory[userId]) {
      return "";
    }

    // Ensure conversations array exists
    if (!memory[userId].conversations || !Array.isArray(memory[userId].conversations)) {
      return "";
    }

    if (memory[userId].conversations.length === 0) {
      return "";
    }

    const username = memory[userId].username || "User";
    const isCreator = userId === CREATOR_ID;
    const userTitle = isCreator ? "Master" : username;

    let formattedConversation = "";

    // Get the last 10 conversation exchanges (or all if less than 10)
    const recentConversations = memory[userId].conversations.slice(-20);

    recentConversations.forEach(msg => {
      // Handle different memory structures
      if (typeof msg === 'string') {
        // Simple format - just raw strings
        formattedConversation += `${msg}\n`;
      } else if (typeof msg === 'object' && msg !== null) {
        // Structured messages
        if (msg.role === "user") {
          formattedConversation += `${userTitle}: ${msg.content}\n`;
        } else if (msg.role === "bot") {
          formattedConversation += `Neko: ${msg.content}\n`;
        } else if (msg.role === "system" && msg.isPinned) {
          // Handle pinned/important memories
          formattedConversation += `[Note: ${msg.content.replace('IMPORTANT MEMORY: ', '')}]\n`;
        }
      }
    });

    return formattedConversation;
  } catch (error) {
    console.error("Error formatting conversation:", error);
    return ""; // Return empty string on error
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