require("dotenv").config();
const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = process.env.PORT || 10000;

// Web pra manter o Render feliz
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
  port: String(PORT),
});

process.on("unhandledRejection", (e) => console.error("UNHANDLED:", e));
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e));

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// logs MUITO importantes do gateway/ws
client.on("debug", (m) => console.log("DEBUG:", m));
client.on("warn", (m) => console.warn("WARN:", m));
client.on("error", (e) => console.error("CLIENT ERROR:", e));
client.on("shardError", (e) => console.error("SHARD ERROR:", e));
client.on("shardDisconnect", (event, shardId) => console.warn(`SHARD ${shardId} DISCONNECT:`, event));
client.on("shardReconnecting", (shardId) => console.warn(`SHARD ${shardId} RECONNECTING...`));
client.on("shardResume", (shardId) => console.log(`SHARD ${shardId} RESUMED.`));

client.once("ready", () => {
  console.log(`✅ READY! Online como ${client.user.tag}`);
});

// “batimento” a cada 5s mostrando status do websocket
setInterval(() => {
  const wsStatus = client.ws?.status;
  const ping = client.ws?.ping;
  console.log(`💓 WS status=${wsStatus} ping=${ping}`);
}, 5000);

// Se em 90s não ficar READY, derruba pra Render reiniciar e logar de novo
setTimeout(() => {
  if (!client.isReady()) {
    console.error("❌ Não ficou READY em 90s. Vou reiniciar o processo pra forçar retry...");
    process.exit(1);
  }
}, 90_000);

(async () => {
  try {
    console.log("🔑 Tentando login no Discord...");
    await client.login(process.env.DISCORD_TOKEN);
    console.log("✅ login() resolveu (agora aguardando READY)...");
  } catch (e) {
    console.error("❌ LOGIN FALHOU:", e);
    console.error("❌ RAW:", e?.rawError || e?.message || e);
    process.exit(1);
  }
})();