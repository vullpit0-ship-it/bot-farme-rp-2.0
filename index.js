require("dotenv").config();
const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = process.env.PORT || 10000;

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  })
  .listen(PORT, () => console.log(`🌐 Web OK na porta ${PORT}`));

console.log("ENV CHECK:", {
  hasToken: !!process.env.DISCORD_TOKEN,
  tokenLen: process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0,
  hasClientId: !!process.env.CLIENT_ID,
  hasGuildId: !!process.env.GUILD_ID,
});

process.on("unhandledRejection", (e) => console.error("UNHANDLED:", e));
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e));

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`✅ READY! Online como ${client.user.tag}`);
});

client.on("error", (e) => console.error("CLIENT ERROR:", e));
client.on("shardError", (e) => console.error("SHARD ERROR:", e));

(async () => {
  try {
    console.log("🔑 Tentando login no Discord...");
    await client.login(process.env.DISCORD_TOKEN);
    console.log("✅ login() retornou (aguardando READY)");
  } catch (e) {
    console.error("❌ LOGIN FALHOU:", e);
    console.error("❌ LOGIN FALHOU RAW:", e?.rawError || e?.message || e);
    process.exit(1);
  }
})();