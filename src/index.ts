import { Client, GatewayIntentBits, Events, Interaction, ActivityType } from 'discord.js';
import * as dotenv from 'dotenv';
import { db } from './database';
import { poolCommand } from './commands/pool';
import { spinCommand } from './commands/spin';
import { suggestCommand } from './commands/suggest';

// Load environment variables
dotenv.config();

const token = process.env.DISCORD_TOKEN;

if (!token || token === 'your_discord_bot_token_here') {
  console.error('❌ Error: DISCORD_TOKEN is not set in the .env file.');
  process.exit(1);
}

// Create Discord Client
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Once bot is logged in
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`📡 Bot is online! Logged in as ${readyClient.user.tag}`);
  
  // Set custom activity
  readyClient.user.setActivity('Spin the Wheel! 🎰', {
    type: ActivityType.Playing,
  });

  // Initialize SQLite database
  try {
    console.log('📦 Connecting to SQLite database...');
    await db.init();
    console.log('✅ SQLite Database initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize SQLite database:', error);
    process.exit(1);
  }
});

// Listen for interactions
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'pool') {
        await poolCommand.execute(interaction);
      } else if (commandName === 'spin') {
        await spinCommand.execute(interaction);
      } else if (commandName === 'suggest') {
        await suggestCommand.execute(interaction);
      }
    }

    // 2. Handle Button Interactions
    else if (interaction.isButton()) {
      const { customId } = interaction;

      if (customId.startsWith('pool_')) {
        await poolCommand.handleButton(interaction);
      } else if (customId.startsWith('spin_')) {
        await spinCommand.handleButton(interaction);
      } else if (customId.startsWith('suggest_')) {
        await suggestCommand.handleButton(interaction);
      }
    }

    // 3. Handle Modal Submit Interactions
    else if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      if (customId.startsWith('pool_')) {
        await poolCommand.handleModal(interaction);
      }
    }
  } catch (error) {
    console.error('❌ Error handling interaction:', error);

    const errorMessage = '⚠️ An error occurred while processing this request. Please try again.';

    // Safely reply to the interaction if possible
    try {
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      }
    } catch (replyError) {
      console.error('Failed to send error message to user:', replyError);
    }
  }
});

// Connect to Discord
client.login(token).catch((error) => {
  console.error('❌ Failed to log in to Discord. Check if your token is valid.', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down bot...');
  await db.close();
  client.destroy();
  console.log('👋 Goodbye!');
  process.exit(0);
});
