require("dotenv").config();
const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = Number(process.env.PORT || 10000);
const BOOT_AT = new Date();

console.log("==================================================");
console.log("🚀 TESTE MINIMO DE LOGIN DISCORD");
console.log("⏰ BOOT_AT:", BOOT_AT.toISOString());
console.log("📦 Node:", process.version);
console.log("ENV CHECK:", {
  hasToken: !!process.env.DISCORD_TOKEN,
  tokenLen: process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0,
  hasClientId: !!process.env.CLIENT_ID,
  clientId: process.env.CLIENT_ID || null,
  hasGuildId: !!process.env.GUILD_ID,
  guildId: process.env.GUILD_ID || null,
  port: String(PORT),
});
console.log("==================================================");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.on("debug", (m) => {
  if (
    m.includes("Preparing to connect") ||
    m.includes("Identifying") ||
    m.includes("Session Limit Information") ||
    m.includes("Heartbeat acknowledged")
  ) {
    console.log("🧠 DEBUG:", m);
  }
});

client.on("warn", (m) => console.warn("⚠️ WARN:", m));
client.on("error", (e) => console.error("🔥 CLIENT ERROR:", e));
client.on("shardError", (e, id) => console.error(`🔥 SHARD ${id} ERROR:`, e));
client.on("shardDisconnect", (event, id) => console.warn(`⚠️ SHARD ${id} DISCONNECT:`, event?.reason || event));
client.on("shardReconnecting", (id) => console.warn(`♻️ SHARD ${id} RECONNECTING...`));
client.on("shardResume", (id) => console.log(`✅ SHARD ${id} RESUMED.`));
client.on("invalidated", () => console.error("🔥 CLIENT INVALIDATED"));

client.on("ready", () => {
  console.log("✅ READY EVENT DISPAROU");
  console.log("🤖 BOT:", client.user.tag);
  console.log("🏠 GUILDS:", client.guilds.cache.size);
});

http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify(
        {
          ok: true,
          bootAt: BOOT_AT.toISOString(),
          node: process.version,
          loggedIn: !!client.user,
          user: client.user?.tag || null,
          wsStatus: client.ws.status,
          uptimeSec: Math.floor(process.uptime()),
        },
        null,
        2
      )
    );
  })
  .listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 WebService OK na porta ${PORT}`);
  });

(async () => {
  try {
    if (!process.env.DISCORD_TOKEN) {
      console.error("❌ DISCORD_TOKEN ausente.");
      process.exit(1);
    }

    console.log("🔑 Iniciando login no Discord...");

    const timer1 = setTimeout(() => {
      console.error("⏳ 15s: login ainda não resolveu.");
    }, 15000);

    const timer2 = setTimeout(() => {
      console.error("⏳ 30s: login ainda não resolveu.");
    }, 30000);

    const timer3 = setTimeout(() => {
      console.error("❌ 60s: login travado. Encerrando processo.");
      process.exit(1);
    }, 60000);

    await client.login(process.env.DISCORD_TOKEN);

    clearTimeout(timer1);
    clearTimeout(timer2);
    clearTimeout(timer3);

    console.log("✅ client.login() resolveu com sucesso.");
  } catch (e) {
    console.error("❌ LOGIN FALHOU:", e);
    process.exit(1);
  }
})();