import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { db, Game } from '../database';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const POPULAR_GAMES = [
  'Elden Ring', 'Minecraft', 'Grand Theft Auto V', 'Cyberpunk 2077', 
  'Valorant', 'Counter-Strike 2', 'Fortnite', 'Apex Legends', 
  'Hades II', 'The Witcher 3', 'Terraria', 'Stardew Valley',
  'Baldur\'s Gate 3', 'League of Legends', 'Overwatch 2'
];

/**
 * Generates a random game name from the guild pool or popular games list
 */
function getRandomName(pool: Game[], excludeTitle: string): string {
  const titles = pool.filter(g => g.title.toLowerCase() !== excludeTitle.toLowerCase()).map(g => g.title);
  const sourceList = titles.length > 0 ? titles : POPULAR_GAMES;
  return sourceList[Math.floor(Math.random() * sourceList.length)];
}

/**
 * Creates the spinner animation embed
 */
function createSpinnerEmbed(topGame: string, midGame: string, bottomGame: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('🎰 Spinning the Wheel... 🎰')
    .setDescription(
      '```\n' +
      '🌀 ────────────────────────────── 🌀\n' +
      `  ▫️  ${topGame}\n` +
      `👉 ⭐  ${midGame.toUpperCase()}  ⭐ 👈\n` +
      `  ▫️  ${bottomGame}\n` +
      '🌀 ────────────────────────────── 🌀\n' +
      '```'
    )
    .setColor(0x9b59b6);
}

/**
 * Creates the winning game celebration embed
 */
export function createWinnerEmbed(winner: Game): EmbedBuilder {
  const platformStr = winner.platform ? `🕹️ **Platform:** \`${winner.platform}\`\n` : '';
  const genreStr = winner.genre ? `🏷️ **Genre:** \`${winner.genre}\`\n` : '';

  return new EmbedBuilder()
    .setTitle('🎉 WE HAVE A WINNER! 🎉')
    .setDescription(
      `The wheel has spoken! Your next game is:\n\n` +
      `# 🎮 ${winner.title}\n\n` +
      `${platformStr}` +
      `${genreStr}` +
      `👤 **Added by:** <@${winner.added_by}>\n` +
      `📅 **Added on:** ${new Date(winner.added_at).toLocaleDateString()}`
    )
    .setColor(0x9b59b6)
    .setTimestamp();
}

/**
 * Creates the action buttons for the spin result
 */
export function createWinnerComponents(winnerId: number): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('spin_again')
      .setLabel('Spin Again')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`spin_remove_${winnerId}`)
      .setLabel('Remove from Pool')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Secondary)
  );
  return [row];
}

export const spinCommand = {
  data: new SlashCommandBuilder()
    .setName('spin')
    .setDescription('Spin the wheel to get a random game to play!'),

  async execute(interaction: ChatInputCommandInteraction | ButtonInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) {
      const msg = '❌ This command can only be used in a server.';
      if (interaction.isButton()) {
        return interaction.reply({ content: msg, ephemeral: true });
      }
      return interaction.reply({ content: msg, ephemeral: true });
    }

    const pool = await db.getGames(guildId);
    if (pool.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('🎰 Spin the Wheel')
        .setDescription(
          '❌ **The spin pool is empty!**\n\n' +
          'Please add some games first using the `/pool` command and clicking **Add Game**.'
        )
        .setColor(0xe74c3c);
      
      if (interaction.isButton()) {
        return interaction.update({ embeds: [embed], components: [] });
      } else {
        return interaction.reply({ embeds: [embed] });
      }
    }

    // Select winner
    const winnerIndex = Math.floor(Math.random() * pool.length);
    const winner = pool[winnerIndex];

    // Generate scrolling entries for the animation
    const top1 = getRandomName(pool, winner.title);
    const bottom1 = getRandomName(pool, winner.title);
    
    const top2 = getRandomName(pool, winner.title);
    const bottom2 = getRandomName(pool, winner.title);

    // Initial reply
    let response;
    const initialEmbed = createSpinnerEmbed(top1, '???', bottom1);
    if (interaction.isButton()) {
      response = await interaction.update({ embeds: [initialEmbed], components: [] });
    } else {
      response = await interaction.reply({ embeds: [initialEmbed], fetchReply: true });
    }

    // Step 2 of animation (Middle roll)
    await sleep(800);
    const step2Embed = createSpinnerEmbed(top2, '⚡ ROLLING ⚡', bottom2);
    if (interaction.isButton()) {
      await interaction.message.edit({ embeds: [step2Embed] });
    } else {
      await interaction.editReply({ embeds: [step2Embed] });
    }

    // Step 3 (Landed)
    await sleep(850);
    const finalEmbed = createWinnerEmbed(winner);
    const components = createWinnerComponents(winner.id);
    
    if (interaction.isButton()) {
      await interaction.message.edit({
        embeds: [finalEmbed],
        components: components,
      });
    } else {
      await interaction.editReply({
        embeds: [finalEmbed],
        components: components,
      });
    }
  },

  /**
   * Handle Button interactions for the spin command
   */
  async handleButton(interaction: ButtonInteraction) {
    const guildId = interaction.guildId!;
    const customId = interaction.customId;

    if (customId === 'spin_again') {
      // Re-trigger the spin logic
      await this.execute(interaction);
    } 
    else if (customId.startsWith('spin_remove_')) {
      const idStr = customId.split('_')[2];
      const id = parseInt(idStr, 10);
      
      if (isNaN(id)) {
        return interaction.reply({ content: '❌ Invalid game ID.', ephemeral: true });
      }

      const success = await db.removeGameById(guildId, id);
      if (success) {
        // Edit current message to disable buttons and confirm deletion
        const currentEmbed = interaction.message.embeds[0];
        const updatedEmbed = EmbedBuilder.from(currentEmbed)
          .setFooter({ text: '🗑️ This game has been removed from the pool.' });

        await interaction.update({
          embeds: [updatedEmbed],
          components: [], // Remove components since the game is deleted
        });
      } else {
        await interaction.reply({
          content: '❌ This game was already removed or does not exist.',
          ephemeral: true
        });
      }
    }
  }
};
