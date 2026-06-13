import { REST, Routes } from 'discord.js';
import * as dotenv from 'dotenv';
import { poolCommand } from './commands/pool';
import { spinCommand } from './commands/spin';
import { suggestCommand } from './commands/suggest';

// Load environment variables
dotenv.config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error('❌ Error: DISCORD_TOKEN and CLIENT_ID must be set in the .env file.');
  process.exit(1);
}

const commands = [
  poolCommand.data.toJSON(),
  spinCommand.data.toJSON(),
  suggestCommand.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`⏳ Starting command deployment: registering ${commands.length} application (/) commands...`);

    // Register commands globally
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands }
    ) as any[];

    console.log(`✅ Successfully deployed ${data.length} application (/) commands globally!`);
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
