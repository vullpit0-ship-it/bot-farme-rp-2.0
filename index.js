require("dotenv").config();
const http = require("http");
const https = require("https");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = process.env.PORT || 3000;

// Web server (Render)
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot test OK");
  })
  .listen(PORT, "0.0.0.0", () => console.log(`🌐 Web OK na porta ${PORT}`));

console.log("ENV CHECK:", {
  hasToken: !!process.env.DISCORD_TOKEN,
  tokenLen: process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0,
  hasClientId: !!process.env.CLIENT_ID,
  hasGuildId: !!process.env.GUILD_ID,
});

// Logs fortes
process.on("unhandledRejection", (e) => console.error("UNHANDLED:", e));
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e));

// 1) Teste de acesso à API do Discord (sem websocket)
function testDiscordApi() {
  return new Promise((resolve) => {
    const req = https.get("https://discord.com/api/v10/gateway", (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.log("✅ Discord API status:", res.statusCode);
        console.log("✅ Discord API body (primeiros 200 chars):", String(data).slice(0, 200));
        resolve();
      });
    });
    req.on("error", (err) => {
      console.error("❌ FALHA ao acessar Discord API:", err);
      resolve();
    });
    req.setTimeout(15000, () => {
      console.error("❌ Timeout acessando Discord API (15s)");
      req.destroy();
      resolve();
    });
  });
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.on("ready", () => {
  console.log(`✅ READY: ${client.user.tag}`);
});

client.on("debug", (m) => console.log("DEBUG:", m)); // MUITO útil
client.on("warn", (m) => console.warn("WARN:", m));
client.on("error", (e) => console.error("CLIENT ERROR:", e));
client.on("shardError", (e) => console.error("SHARD ERROR:", e));
client.on("shardDisconnect", (event, shardId) => console.warn(`SHARD ${shardId} DISCONNECT:`, event?.reason));
client.on("shardReconnecting", (shardId) => console.warn(`SHARD ${shardId} RECONNECTING...`));
client.on("shardResume", (shardId) => console.log(`SHARD ${shardId} RESUMED.`));

// Se não ficar READY em 60s, encerra (pra Render reiniciar)
setTimeout(() => {
  if (!client.isReady()) {
    console.error("❌ Não ficou READY em 60s. Encerrando processo...");
    process.exit(1);
  }
}, 60_000);

(async () => {
  if (!process.env.DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN vazio no Render.");
    process.exit(1);
  }

  await testDiscordApi();

  try {
    console.log("🔑 Iniciando login...");
    await client.login(process.env.DISCORD_TOKEN);
    console.log("✅ login() retornou (aguardando READY...)");
  } catch (err) {
    console.error("❌ ERRO NO LOGIN:", err);
    process.exit(1);
  }
})();