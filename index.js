require("dotenv").config();
const http = require("http");
const { Client, GatewayIntentBits } = require("discord.js");

const PORT = Number(process.env.PORT || 10000);
const BOOT_AT = new Date();

function maskToken(token) {
  if (!token) return null;
  if (token.length <= 10) return "***";
  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function analyzeToken(token) {
  if (!token) {
    return {
      exists: false,
      length: 0,
      trimmedLength: 0,
      hasLeadingOrTrailingSpaces: false,
      hasQuotesWrapping: false,
      hasWhitespaceInside: false,
      preview: null,
    };
  }

  const trimmed = token.trim();

  return {
    exists: true,
    length: token.length,
    trimmedLength: trimmed.length,
    hasLeadingOrTrailingSpaces: token !== trimmed,
    hasQuotesWrapping:
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")),
    hasWhitespaceInside: /\s/.test(token),
    preview: maskToken(trimmed),
  };
}

const rawToken = process.env.DISCORD_TOKEN || "";
const tokenInfo = analyzeToken(rawToken);
const DISCORD_TOKEN = rawToken.trim().replace(/^["']|["']$/g, "");

console.log("==================================================");
console.log("🚀 DIAGNÓSTICO COMPLETO DISCORD");
console.log("⏰ BOOT_AT:", BOOT_AT.toISOString());
console.log("📦 Node:", process.version);
console.log("ENV CHECK:", {
  hasToken: !!rawToken,
  tokenInfo,
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
client.on("shardDisconnect", (event, id) =>
  console.warn(`⚠️ SHARD ${id} DISCONNECT:`, event?.reason || event)
);
client.on("shardReconnecting", (id) => console.warn(`♻️ SHARD ${id} RECONNECTING...`));
client.on("shardResume", (id) => console.log(`✅ SHARD ${id} RESUMED.`));
client.on("invalidated", () => console.error("🔥 CLIENT INVALIDATED"));

client.on("ready", () => {
  console.log("✅ READY EVENT DISPAROU");
  console.log("🤖 BOT:", client.user.tag);
  console.log("🏠 GUILDS:", client.guilds.cache.size);
});

async function testDiscordREST() {
  console.log("🌍 Testando REST com /users/@me ...");

  try {
    const res = await fetch("https://discord.com/api/v10/users/@me", {
      method: "GET",
      headers: {
        Authorization: `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();

    console.log("📡 REST STATUS:", res.status);

    if (!res.ok) {
      console.log("📡 REST BODY:", text);
      return { ok: false, status: res.status, body: text };
    }

    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    console.log("✅ REST OK:", {
      id: json?.id || null,
      username: json?.username || null,
      discriminator: json?.discriminator || null,
      global_name: json?.global_name || null,
      bot: json?.bot || null,
    });

    return { ok: true, status: res.status, body: json };
  } catch (e) {
    console.error("❌ REST ERROR:", e);
    return { ok: false, status: 0, body: String(e) };
  }
}

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
          tokenInfo,
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
    if (!DISCORD_TOKEN) {
      console.error("❌ DISCORD_TOKEN ausente.");
      process.exit(1);
    }

    const restResult = await testDiscordREST();

    if (!restResult.ok) {
      console.error("❌ O token falhou no teste REST.");
      console.error("👉 Isso quase sempre significa token inválido, revogado, colado errado, com aspas ou espaço.");
      process.exit(1);
    }

    console.log("🔑 Iniciando login websocket no Discord...");

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

    await client.login(DISCORD_TOKEN);

    clearTimeout(timer1);
    clearTimeout(timer2);
    clearTimeout(timer3);

    console.log("✅ client.login() resolveu com sucesso.");
  } catch (e) {
    console.error("❌ LOGIN FALHOU:", e);
    process.exit(1);
  }
})();