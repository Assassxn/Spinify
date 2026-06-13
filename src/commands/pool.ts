import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { db, Game } from '../database';

const PAGE_SIZE = 5;

/**
 * Creates the pool embed with pagination.
 */
export function createPoolEmbed(games: Game[], page: number, totalPages: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('🎮 Server Game Spin Pool')
    .setColor(0x2c3e50)
    .setTimestamp();

  if (games.length === 0) {
    embed.setDescription(
      '✨ **The pool is currently empty!**\n\n' +
      'Click the ➕ **Add Game** button below to add your first game to the wheel, or use `/suggest` to find some new games!'
    );
    return embed;
  }

  const startIndex = page * PAGE_SIZE;
  const pageGames = games.slice(startIndex, startIndex + PAGE_SIZE);

  let desc = `📊 Total games in wheel: **${games.length}**\n\n`;
  pageGames.forEach((game, index) => {
    const gameNum = startIndex + index + 1;
    const platformStr = game.platform ? ` \`[${game.platform}]\`` : '';
    const genreStr = game.genre ? ` *(${game.genre})*` : '';
    desc += `**${gameNum}.** **${game.title}**${platformStr}${genreStr}\n`;
    desc += `   └ Added by <@${game.added_by}> (ID: \`${game.id}\`)\n\n`;
  });

  embed.setDescription(desc);
  embed.setFooter({ text: `Page ${page + 1} of ${totalPages} • Spin Wheel Pool` });
  return embed;
}

/**
 * Creates the row of buttons for the pool dashboard.
 */
export function createPoolComponents(page: number, totalPages: number, isEmpty: boolean): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>();

  const prevBtn = new ButtonBuilder()
    .setCustomId(`pool_prev_${page}`)
    .setLabel('◀')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page <= 0);

  const nextBtn = new ButtonBuilder()
    .setCustomId(`pool_next_${page}`)
    .setLabel('▶')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page >= totalPages - 1 || isEmpty);

  const addBtn = new ButtonBuilder()
    .setCustomId('pool_add')
    .setLabel('Add Game')
    .setEmoji('➕')
    .setStyle(ButtonStyle.Success);

  const removeBtn = new ButtonBuilder()
    .setCustomId('pool_remove')
    .setLabel('Remove')
    .setEmoji('❌')
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(isEmpty);

  const clearBtn = new ButtonBuilder()
    .setCustomId('pool_clear')
    .setLabel('Clear Pool')
    .setEmoji('🗑️')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(isEmpty);

  row.addComponents(prevBtn, nextBtn, addBtn, removeBtn, clearBtn);
  return [row];
}

export const poolCommand = {
  data: new SlashCommandBuilder()
    .setName('pool')
    .setDescription("View and manage the server's spin wheel game pool"),

  async execute(interaction: ChatInputCommandInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      return interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
    }

    const games = await db.getGames(guildId);
    const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));

    const embed = createPoolEmbed(games, 0, totalPages);
    const components = createPoolComponents(0, totalPages, games.length === 0);

    await interaction.reply({
      embeds: [embed],
      components: components,
    });
  },

  /**
   * Handle Button interactions for the pool command
   */
  async handleButton(interaction: ButtonInteraction) {
    const guildId = interaction.guildId!;
    const customId = interaction.customId;

    if (customId.startsWith('pool_prev_') || customId.startsWith('pool_next_')) {
      // Parse current page from custom ID
      const parts = customId.split('_');
      const currentPage = parseInt(parts[2], 10);
      const isNext = parts[1] === 'next';
      
      const games = await db.getGames(guildId);
      const totalPages = Math.ceil(games.length / PAGE_SIZE);
      
      let newPage = isNext ? currentPage + 1 : currentPage - 1;
      if (newPage < 0) newPage = 0;
      if (newPage >= totalPages) newPage = totalPages - 1;

      const embed = createPoolEmbed(games, newPage, totalPages);
      const components = createPoolComponents(newPage, totalPages, games.length === 0);

      await interaction.update({
        embeds: [embed],
        components: components,
      });
    } 
    else if (customId === 'pool_add') {
      // Open modal to add a game
      const modal = new ModalBuilder()
        .setCustomId('pool_add_modal')
        .setTitle('Add Game to Spin Wheel');

      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Game Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(100)
        .setPlaceholder('e.g., Minecraft, Elden Ring, Valorant');

      const platformInput = new TextInputBuilder()
        .setCustomId('platform')
        .setLabel('Platform (Optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(50)
        .setPlaceholder('e.g., PC, Steam, PS5, Switch');

      const genreInput = new TextInputBuilder()
        .setCustomId('genre')
        .setLabel('Genre (Optional)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(50)
        .setPlaceholder('e.g., RPG, Sandbox, FPS, Coop');

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(platformInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(genreInput)
      );

      await interaction.showModal(modal);
    } 
    else if (customId === 'pool_remove') {
      // Open modal to remove a game by ID
      const modal = new ModalBuilder()
        .setCustomId('pool_remove_modal')
        .setTitle('Remove Game from Pool');

      const idInput = new TextInputBuilder()
        .setCustomId('game_id')
        .setLabel('Game ID (shown in the list)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setPlaceholder('e.g., 12');

      modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(idInput));
      await interaction.showModal(modal);
    } 
    else if (customId === 'pool_clear') {
      // Show confirmation dialog
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Clear Spin Wheel Pool')
        .setDescription('Are you sure you want to delete **ALL** games in this server\'s pool? This action cannot be undone.')
        .setColor(0xe74c3c);

      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('pool_clear_yes')
          .setLabel('Yes, Clear All')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('pool_clear_no')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.update({
        embeds: [embed],
        components: [confirmRow],
      });
    } 
    else if (customId === 'pool_clear_yes') {
      await db.clearPool(guildId);
      
      const games = await db.getGames(guildId);
      const embed = createPoolEmbed(games, 0, 1);
      const components = createPoolComponents(0, 1, true);

      await interaction.update({
        embeds: [
          embed.setFooter({ text: 'Pool cleared successfully.' })
        ],
        components: components,
      });
    } 
    else if (customId === 'pool_clear_no') {
      // Go back to first page of pool
      const games = await db.getGames(guildId);
      const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
      const embed = createPoolEmbed(games, 0, totalPages);
      const components = createPoolComponents(0, totalPages, games.length === 0);

      await interaction.update({
        embeds: [embed],
        components: components,
      });
    }
  },

  /**
   * Handle Modal Submissions for the pool command
   */
  async handleModal(interaction: ModalSubmitInteraction) {
    const guildId = interaction.guildId!;
    const customId = interaction.customId;

    if (customId === 'pool_add_modal') {
      const title = interaction.fields.getTextInputValue('title');
      const platform = interaction.fields.getTextInputValue('platform') || null;
      const genre = interaction.fields.getTextInputValue('genre') || null;

      // Check if it already exists
      const exists = await db.gameExists(guildId, title);
      if (exists) {
        return interaction.reply({
          content: `❌ **${title}** is already in this server's spin wheel pool!`,
          ephemeral: true,
        });
      }

      // Add to database
      await db.addGame(guildId, title, platform, genre, interaction.user.id);

      // Fetch updated list and update dashboard in-place
      const games = await db.getGames(guildId);
      const totalPages = Math.ceil(games.length / PAGE_SIZE);
      const embed = createPoolEmbed(games, 0, totalPages);
      const components = createPoolComponents(0, totalPages, false);

      if (interaction.isFromMessage()) {
        await interaction.update({
          embeds: [embed],
          components: components,
        });
      }
    } 
    else if (customId === 'pool_remove_modal') {
      const idStr = interaction.fields.getTextInputValue('game_id');
      const id = parseInt(idStr, 10);

      if (isNaN(id)) {
        return interaction.reply({
          content: '❌ Invalid Game ID. Please enter a valid number.',
          ephemeral: true,
        });
      }

      const success = await db.removeGameById(guildId, id);
      if (!success) {
        return interaction.reply({
          content: `❌ Could not find a game with ID \`${id}\` in this server's pool.`,
          ephemeral: true,
        });
      }

      // Fetch updated list and update dashboard in-place
      const games = await db.getGames(guildId);
      const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
      const embed = createPoolEmbed(games, 0, totalPages);
      const components = createPoolComponents(0, totalPages, games.length === 0);

      if (interaction.isFromMessage()) {
        await interaction.update({
          embeds: [embed],
          components: components,
        });
      }
    }
  }
};
