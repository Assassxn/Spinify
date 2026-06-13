import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { db } from '../database';

interface FreeToGameGame {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string;
  publisher: string;
  developer: string;
  release_date: string;
}

/**
 * Fetches a random game from the FreeToGame API based on filters.
 */
async function fetchGameSuggestion(genre?: string, platform?: string): Promise<FreeToGameGame | null> {
  let url = 'https://www.freetogame.com/api/games';
  const params: string[] = [];

  if (platform && platform !== 'all') {
    params.push(`platform=${encodeURIComponent(platform)}`);
  }
  if (genre && genre !== 'none') {
    params.push(`category=${encodeURIComponent(genre)}`);
  }

  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const games = (await response.json()) as FreeToGameGame[];
    if (!games || games.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * games.length);
    return games[randomIndex];
  } catch (error) {
    console.error('Error fetching game suggestion:', error);
    return null;
  }
}

/**
 * Fetches a single game's detailed info from FreeToGame API.
 */
async function fetchGameDetails(id: number): Promise<FreeToGameGame | null> {
  const url = `https://www.freetogame.com/api/game?id=${id}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as FreeToGameGame;
  } catch (error) {
    console.error(`Error fetching game details for ID ${id}:`, error);
    return null;
  }
}

/**
 * Creates a beautiful suggestion embed.
 */
export function createSuggestionEmbed(game: FreeToGameGame): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`💡 Game Suggestion: ${game.title}`)
    .setDescription(
      `### ${game.short_description}\n\n` +
      `🏷️ **Genre:** \`${game.genre}\`\n` +
      `🕹️ **Platform:** \`${game.platform}\`\n` +
      `💻 **Developer:** \`${game.developer}\`\n` +
      `🏢 **Publisher:** \`${game.publisher}\`\n` +
      `📅 **Release Date:** \`${game.release_date}\``
    )
    .setImage(game.thumbnail)
    .setColor(0x2ecc71)
    .setFooter({ text: 'Powered by FreeToGame API' })
    .setTimestamp();
}

/**
 * Creates suggestion button rows.
 */
export function createSuggestionComponents(
  gameId: number,
  genre: string,
  platform: string,
  playUrl: string
): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`suggest_add_${gameId}`)
      .setLabel('Add to Spin Pool')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`suggest_roll_${genre}_${platform}`)
      .setLabel('Roll Another')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setLabel('Play Game')
      .setEmoji('🔗')
      .setStyle(ButtonStyle.Link)
      .setURL(playUrl)
  );
  return [row];
}

export const suggestCommand = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Find a fun free game and optionally add it to the spin wheel')
    .addStringOption((option) =>
      option
        .setName('genre')
        .setDescription('Filter by game genre')
        .setRequired(false)
        .addChoices(
          { name: 'MMORPG', value: 'mmorpg' },
          { name: 'Shooter', value: 'shooter' },
          { name: 'Strategy', value: 'strategy' },
          { name: 'MOBA', value: 'moba' },
          { name: 'Racing', value: 'racing' },
          { name: 'Sports', value: 'sports' },
          { name: 'Sandbox / Open World', value: 'sandbox' },
          { name: 'Survival', value: 'survival' },
          { name: 'Action RPG', value: 'action-rpg' },
          { name: 'Card Game', value: 'card' },
          { name: 'Battle Royale', value: 'battle-royale' },
          { name: 'Anime', value: 'anime' },
          { name: 'Fantasy', value: 'fantasy' },
          { name: 'Sci-Fi', value: 'sci-fi' },
          { name: 'Horror', value: 'horror' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('platform')
        .setDescription('Filter by gaming platform')
        .setRequired(false)
        .addChoices(
          { name: 'PC (Windows)', value: 'pc' },
          { name: 'Web Browser', value: 'browser' },
          { name: 'All Platforms', value: 'all' }
        )
    ),

  async execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    let genre = 'none';
    let platform = 'all';

    if (interaction.isChatInputCommand()) {
      genre = interaction.options.getString('genre') || 'none';
      platform = interaction.options.getString('platform') || 'all';
      await interaction.deferReply();
    } else if (interaction.isButton()) {
      const parts = interaction.customId.split('_');
      genre = parts[2];
      platform = parts[3];
      await interaction.deferReply();
    }

    const game = await fetchGameSuggestion(genre, platform);
    if (!game) {
      const msg = '❌ Could not fetch any games matching those criteria. Try another filter!';
      if (interaction.isChatInputCommand()) {
        await interaction.editReply(msg);
      } else {
        await interaction.followUp({ content: msg, ephemeral: true });
      }
      return;
    }

    const embed = createSuggestionEmbed(game);
    const components = createSuggestionComponents(game.id, genre, platform, game.game_url);

    if (interaction.isChatInputCommand()) {
      await interaction.editReply({ embeds: [embed], components });
    } else {
      await interaction.editReply({ embeds: [embed], components });
    }
  },

  /**
   * Handle Button interactions for the suggest command
   */
  async handleButton(interaction: ButtonInteraction) {
    const guildId = interaction.guildId!;
    const customId = interaction.customId;

    if (customId.startsWith('suggest_roll_')) {
      await this.execute(interaction);
    } 
    else if (customId.startsWith('suggest_add_')) {
      const gameIdStr = customId.split('_')[2];
      const gameId = parseInt(gameIdStr, 10);

      if (isNaN(gameId)) {
        return interaction.reply({ content: '❌ Invalid game ID.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      // Fetch game details to save to db
      const game = await fetchGameDetails(gameId);
      if (!game) {
        return interaction.editReply('❌ Failed to fetch game details to add to pool.');
      }

      // Check duplicate
      const exists = await db.gameExists(guildId, game.title);
      if (exists) {
        return interaction.editReply(`❌ **${game.title}** is already in this server's spin pool!`);
      }

      // Add to database
      await db.addGame(
        guildId,
        game.title,
        game.platform,
        game.genre,
        interaction.user.id
      );

      // Disable the Add Button on the original message to show it has been added
      const currentEmbed = interaction.message.embeds[0];
      const currentComponents = interaction.message.components[0] as any;
      
      const newActionRow = new ActionRowBuilder<ButtonBuilder>();
      for (const component of currentComponents.components) {
        if (component.type === 2) { // Button component
          const btn = ButtonBuilder.from(component as any);
          if (component.customId && component.customId.startsWith('suggest_add_')) {
            btn.setDisabled(true).setLabel('Added to Pool!').setStyle(ButtonStyle.Secondary).setEmoji('✅');
          }
          newActionRow.addComponents(btn);
        }
      }

      await interaction.message.edit({
        embeds: [currentEmbed],
        components: [newActionRow],
      });

      await interaction.editReply(`✅ Successfully added **${game.title}** to the spin pool!`);
    }
  }
};
