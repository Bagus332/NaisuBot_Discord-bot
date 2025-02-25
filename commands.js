const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};
  // Handle slash commands
  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ping') {
      await interaction.reply('Pong!');
    } else if (commandName === 'help') {
      await interaction.reply('Available commands: /ping, /help');
    }
    // Handle more commands here
  });
