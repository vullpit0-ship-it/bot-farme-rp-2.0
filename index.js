require("dotenv").config();
const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot test OK");
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Web OK na porta ${PORT}`);
  });

console.log("ENV CHECK:", {
  hasToken: !!process.env.DISCORD_TOKEN,
  tokenLen: process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0,
  hasClientId: !!process.env.CLIENT_ID,
  hasGuildId: !!process.env.GUILD_ID,
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.on("ready", () => {
  console.log(`✅ READY: ${client.user.tag}`);
});

client.on("error", (err) => {
  console.error("CLIENT ERROR:", err);
});

client.on("warn", (msg) => {
  console.warn("WARN:", msg);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

(async () => {
  try {
    if (!process.env.DISCORD_TOKEN) {
      throw new Error("DISCORD_TOKEN não configurado.");
    }

    console.log("🔑 Iniciando login...");
    await client.login(process.env.DISCORD_TOKEN);
    console.log("✅ login() retornou com sucesso");
  } catch (err) {
    console.error("❌ ERRO NO LOGIN:", err);
    process.exit(1);
  }
})();