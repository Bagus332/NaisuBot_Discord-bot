import { SlashCommandBuilder } from "discord.js";
import "dotenv/config";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { spawn } from "child_process";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const commands = [
  new SlashCommandBuilder()
    .setName('generate_image')
    .setDescription('Generates an image based on the provided prompt')
    .addStringOption(option => 
      option.setName('prompt')
        .setDescription('The prompt for generating the image')
        .setRequired(true)),
  new SlashCommandBuilder()
    .setName('process_image')
    .setDescription('Processes an uploaded image')
    .addAttachmentOption(option => 
      option.setName('image')
        .setDescription('The image to process')
        .setRequired(true)),
  // Add more commands here
];

async function registerCommands(clientId, token) {
  const rest = new REST({ version: '9' }).setToken(token);
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map(command => command.toJSON()) },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

async function handleInteraction(interaction) {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'generate_image') {
    const prompt = interaction.options.getString('prompt');
    await interaction.deferReply();
    const response = await generateImage(prompt);
    await interaction.editReply({ files: response });
  }

  if (commandName === 'process_image') {
    const image = interaction.options.getAttachment('image');
    await interaction.deferReply();
    const processedImage = await callPython(image.url);
    await interaction.editReply({ files: [{ attachment: Buffer.from(processedImage, 'base64'), name: 'processed_image.jpg' }] });
  }
  // Handle more commands here
}

async function generateImage(prompt) {
  const genAIClient = new GenAIClient({ api_key: GEMINI_API_KEY });
  const response = await genAIClient.models.generate_images({
    model: 'imagen-3.0-generate-002',
    prompt: prompt,
    config: types.GenerateImagesConfig({
      number_of_images: 4,
    }),
  });

  const images = [];
  for (const generated_image of response.generated_images) {
    const image = Image.open(BytesIO(generated_image.image.image_bytes));
    const buffer = new Buffer.from(image.tobytes(), 'binary');
    const processedImage = await callPython(buffer.toString('base64'));
    images.push({ attachment: Buffer.from(processedImage, 'base64'), name: 'image.png' });
  }
  return images;
}

function callPython(imageData) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn("python", [
      "image_processor.py",
      JSON.stringify({ image_data: imageData }),
    ]);

    let result = "";
    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(result).resized_image);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(`Python script exited with code ${code}`);
      }
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });
  });
}

export { commands, handleInteraction, registerCommands };