# 🎮 Discord Game Spin Bot

A premium, interactive Discord bot written in **TypeScript** using **`discord.js` (v14)**. It allows users to store a customized list of games, spin a wheel with a slot-machine rolling animation to decide what to play next, and discover new free-to-play titles from a public API.

---

## ✨ Features

- **📊 Server Game Pool (`/pool`):**
  - View games added to your server's pool with interactive pagination buttons.
  - Add games seamlessly via custom Discord **Modals**.
  - Remove games by ID using Modals.
  - Reset the pool with built-in clear confirmation screens.
  
- **🎰 The Spin Wheel (`/spin`):**
  - Selects a random game from your pool.
  - Plays a **3-step rolling slot-machine animation** using dynamic embed updates in chat.
  - Celebrate the winner with options to **Spin Again** or **Remove from Pool** in a single click.

- **💡 Game Suggestions (`/suggest`):**
  - Discovers free-to-play PC and browser titles using the keyless **FreeToGame API**.
  - Filter by **genre** (RPG, FPS, MOBA, Horror, card games, etc.) and **platform** (PC or Web).
  - Embeds full metadata, images, and links to play.
  - Reroll or **Add to Spin Pool** directly from the suggestion message!

- **💾 SQLite Persistence:**
  - Saves game pools per server, allowing multiple guilds to run the bot independently with zero overlap.

---

## 🛠️ Prerequisites

Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18.x or newer recommended)
- [npm](https://www.npmjs.com/) (installed automatically with Node.js)
- A Discord Developer Application (create one at the [Discord Developer Portal](https://discord.com/developers/applications))

---

## 🚀 Installation & Setup

### 1. Clone & Install Dependencies
Download this repository and navigate into the folder. Then install dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
```
Open `.env` and fill in your details:
```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_client_id_here
```
> **How to get your credentials:**
> - **DISCORD_TOKEN:** Go to the Discord Developer Portal -> select your App -> **Bot** tab -> Click **Reset Token** and copy the string.
> - **CLIENT_ID:** Go to the Discord Developer Portal -> select your App -> **General Information** tab -> Copy the **Application ID**.

### 3. Enable Privileged Intents
In the Discord Developer Portal, go to the **Bot** tab:
1. Scroll down to **Privileged Gateway Intents**.
2. Make sure the **Guilds** intent is toggled on (enabled by default).
3. *Note:* Since the bot operates entirely on Slash Commands, Modals, and Button interactions, **Message Content Intent is NOT required**.

### 4. Deploy Slash Commands
Register the application commands (`/pool`, `/spin`, `/suggest`) globally on Discord:
```bash
npm run deploy
```

### 5. Run the Bot
To start the bot in development mode (with hot-reloading):
```bash
npm run dev
```

To compile the TypeScript code and run in production mode:
```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
spin-bot/
├── src/
│   ├── index.ts          # Main entry point, Discord client initialization, and event routing
│   ├── database.ts       # Database connector and CRUD operations for games
│   ├── deploy-commands.ts# Utility script to register slash commands globally
│   └── commands/         # Command logic
│       ├── pool.ts       # Logic for pool controls, dashboard, pagination, and modals
│       ├── spin.ts       # Logic for the spinner logic and celebration embeds
│       └── suggest.ts    # Logic for query fetching, filters, and suggestion embeds
├── package.json          # Package info, scripts, and dependencies
└── tsconfig.json         # TypeScript compiler configurations
```

---

## 📄 License
This project is licensed under the ISC License.
All game data is fetched from and credited to [FreeToGame](https://www.freetogame.com/).
