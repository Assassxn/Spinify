import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as path from 'path';

export interface Game {
  id: number;
  guild_id: string;
  title: string;
  platform: string | null;
  genre: string | null;
  added_by: string;
  added_at: string;
}

export class GameDatabase {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    this.dbPath = path.join(process.cwd(), 'spin_bot.db');
  }

  /**
   * Initializes the database connection and creates the games table if it does not exist.
   */
  async init(): Promise<void> {
    if (this.db) return;

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT NOT NULL,
        title TEXT NOT NULL,
        platform TEXT,
        genre TEXT,
        added_by TEXT NOT NULL,
        added_at TEXT NOT NULL
      )
    `);

    // Create indexes for faster queries by server
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_games_guild ON games(guild_id)
    `);
  }

  /**
   * Closes the database connection.
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  /**
   * Adds a game to the server's spin pool.
   */
  async addGame(
    guildId: string,
    title: string,
    platform: string | null,
    genre: string | null,
    addedBy: string
  ): Promise<number> {
    await this.init();
    const now = new Date().toISOString();
    const result = await this.db!.run(
      `INSERT INTO games (guild_id, title, platform, genre, added_by, added_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, title.trim(), platform ? platform.trim() : null, genre ? genre.trim() : null, addedBy, now]
    );
    return result.lastID!;
  }

  /**
   * Checks if a game already exists in a guild's pool.
   */
  async gameExists(guildId: string, title: string): Promise<boolean> {
    await this.init();
    const row = await this.db!.get(
      'SELECT 1 FROM games WHERE guild_id = ? AND LOWER(title) = LOWER(?) LIMIT 1',
      [guildId, title.trim()]
    );
    return !!row;
  }

  /**
   * Gets all games in a server's spin pool.
   */
  async getGames(guildId: string): Promise<Game[]> {
    await this.init();
    return this.db!.all<Game[]>(
      'SELECT id, guild_id, title, platform, genre, added_by, added_at FROM games WHERE guild_id = ? ORDER BY id DESC',
      [guildId]
    );
  }

  /**
   * Gets a random game from a server's spin pool.
   */
  async getRandomGame(guildId: string): Promise<Game | null> {
    await this.init();
    const row = await this.db!.get<Game>(
      'SELECT id, guild_id, title, platform, genre, added_by, added_at FROM games WHERE guild_id = ? ORDER BY RANDOM() LIMIT 1',
      [guildId]
    );
    return row || null;
  }

  /**
   * Removes a game by its unique ID.
   */
  async removeGameById(guildId: string, id: number): Promise<boolean> {
    await this.init();
    const result = await this.db!.run(
      'DELETE FROM games WHERE guild_id = ? AND id = ?',
      [guildId, id]
    );
    return (result.changes ?? 0) > 0;
  }

  /**
   * Removes a game by its title (case-insensitive).
   */
  async removeGameByTitle(guildId: string, title: string): Promise<boolean> {
    await this.init();
    const result = await this.db!.run(
      'DELETE FROM games WHERE guild_id = ? AND LOWER(title) = LOWER(?)',
      [guildId, title.trim()]
    );
    return (result.changes ?? 0) > 0;
  }

  /**
   * Clears the entire spin pool for a server.
   */
  async clearPool(guildId: string): Promise<number> {
    await this.init();
    const result = await this.db!.run(
      'DELETE FROM games WHERE guild_id = ?',
      [guildId]
    );
    return result.changes ?? 0;
  }
}

export const db = new GameDatabase();
