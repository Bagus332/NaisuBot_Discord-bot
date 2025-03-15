import SpotifyWebApi from 'spotify-web-api-node';
import { Client, GatewayIntentBits,} from 'discord.js';
import 'dotenv/config';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

const playbackManagers = {};

async function playMusic(interaction, query) {
  try {
    const data = await spotifyApi.searchTracks(query);
    const track = data.body.tracks.items[0];
    if (track) {
      await interaction.reply(`Now playing: ${track.name} by ${track.artists.map(artist => artist.name).join(', ')}`);
      const url = `https://www.youtube.com/watch?v=${track.external_urls.spotify.split('/').pop()}`;
      const stream = ytdl(url, { filter: 'audioonly' });
      const resource = createAudioResource(stream);

      const voiceChannel = interaction.member.voice.channel;
      if (!voiceChannel) {
        return interaction.reply('You need to be in a voice channel to play music!');
      }

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      player.play(resource);

      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      player.on('error', error => {
        console.error('Error:', error);
        connection.destroy();
      });

      playbackManagers[voiceChannel.guild.id] = { connection, player, resource };
    } else {
      await interaction.reply('No track found with that query.');
    }
  } catch (error) {
    console.error('Spotify API Error:', error);
    await interaction.reply('⚠️ Error: Something went wrong with Spotify.');
  }
}

export { playMusic };