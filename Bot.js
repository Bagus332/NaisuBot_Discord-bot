require("dotenv").config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
  const commands = [
    new SlashCommandBuilder()
      .setName("rps")
      .setDescription("Play Rock-Paper-Scissors!")
      .addStringOption((option) =>
        option.setName("choice").setDescription("Choose rock, paper, or scissors").setRequired(true)
      ),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log("[✅] Slash commands registered!");
  } catch (error) {
    console.error("[❌] Failed to register commands:", error);
  }
});

// Slash command handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "rps") {
    const userChoice = interaction.options.getString("choice").toLowerCase();
    const choices = ["rock", "paper", "scissors"];
    const botChoice = choices[Math.floor(Math.random() * choices.length)];

    let result = "";
    if (userChoice === botChoice) {
      result = "It's a **tie**! 🤝";
    } else if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "scissors" && botChoice === "paper") ||
      (userChoice === "paper" && botChoice === "rock")
    ) {
      result = "**You win! 🎉**";
    } else {
      result = "**I win! 😎**";
    }

    await interaction.reply(`You chose **${userChoice}**, I chose **${botChoice}**. ${result}`);
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
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateText?key=${GEMINI_API_KEY}`,
      {
        prompt: { text: input },
      }
    );

    if (response.data && response.data.candidates && response.data.candidates[0].output) {
      return response.data.candidates[0].output;
    } else {
      return "[🤖] Sorry, I couldn't generate a response.";
    }
  } catch (error) {
    console.error("[❌] Gemini API Error:", error.response?.data || error.message);
    return "[🤖] Error fetching AI response.";
  }
}

// Start bot
client.login(TOKEN);
