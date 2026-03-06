require("dotenv").config();
const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = process.env.PORT || 3000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
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

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ READY! Online como ${client.user.tag}`);
});

client.on("error", (err) => {
  console.error("CLIENT ERROR:", err);
});

client.on("warn", (msg) => {
  console.warn("CLIENT WARN:", msg);
});

client.on("shardError", (err) => {
  console.error("SHARD ERROR:", err);
});

client.on("shardDisconnect", (event, id) => {
  console.error(`SHARD ${id} DISCONNECT:`, event?.reason || event);
});

client.on("shardReconnecting", (id) => {
  console.warn(`SHARD ${id} RECONNECTING...`);
});

client.on("shardResume", (id) => {
  console.log(`SHARD ${id} RESUMED`);
});

(async () => {
  try {
    if (!process.env.DISCORD_TOKEN) {
      console.error("❌ DISCORD_TOKEN não encontrado.");
      process.exit(1);
    }

    console.log("🔑 Tentando login no Discord...");
    await client.login(process.env.DISCORD_TOKEN);
    console.log("🟢 login() resolveu, aguardando READY...");
  } catch (err) {
    console.error("❌ LOGIN FALHOU:");
    console.error(err);
    process.exit(1);
  }
})();