require("dotenv").config();
const fs = require("fs");
const path = require("path");
const cron = require("node-cron");
const { DateTime } = require("luxon");
const http = require("http");

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

// ======================================================
// BOOT / STATUS GLOBAL
// ======================================================
const BOOT_AT = new Date();
let READY_AT = null;
let LAST_HEARTBEAT_AT = null;
let READY_RAN = false;
let CRON_STARTED = false;

// ======================================================
// CONFIG RENDER / WEB SERVER
// ======================================================
const PORT = Number(process.env.PORT || 3000);

const server = http.createServer((req, res) => {
  const uptimeSec = Math.floor(process.uptime());
  const payload = {
    ok: true,
    bootAt: BOOT_AT.toISOString(),
    readyAt: READY_AT ? READY_AT.toISOString() : null,
    uptimeSec,
    pid: process.pid,
    memory: process.memoryUsage(),
    discord: {
      loggedIn: !!client?.user,
      userTag: client?.user?.tag || null,
      wsStatus: client?.ws?.status ?? null,
      guilds: client?.guilds?.cache?.size ?? 0,
      lastHeartbeatAt: LAST_HEARTBEAT_AT ? LAST_HEARTBEAT_AT.toISOString() : null,
    },
  };

  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 WebService OK na porta ${PORT}`);
});

// ======================================================
// LOGS IMPORTANTES
// ======================================================
console.log("==================================================");
console.log("🚀 BOOT INICIADO");
console.log("⏰ BOOT_AT:", BOOT_AT.toISOString());
console.log("📦 Node:", process.version);
console.log("🖥️ Platform:", process.platform, process.arch);
console.log("📁 __dirname:", __dirname);
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

process.on("unhandledRejection", (e) => {
  console.error("🔥 UNHANDLED REJECTION:", e);
});

process.on("uncaughtException", (e) => {
  console.error("🔥 UNCAUGHT EXCEPTION:", e);
});

process.on("uncaughtExceptionMonitor", (e) => {
  console.error("🔥 UNCAUGHT EXCEPTION MONITOR:", e);
});

process.on("warning", (w) => {
  console.warn("⚠️ PROCESS WARNING:", w);
});

process.on("SIGTERM", () => {
  console.warn("⚠️ Recebi SIGTERM. Encerrando processo...");
  try {
    server.close(() => console.log("🌐 HTTP server fechado."));
  } catch {}
  try {
    client.destroy();
  } catch {}
  process.exit(0);
});

process.on("SIGINT", () => {
  console.warn("⚠️ Recebi SIGINT. Encerrando processo...");
  try {
    server.close(() => console.log("🌐 HTTP server fechado."));
  } catch {}
  try {
    client.destroy();
  } catch {}
  process.exit(0);
});

// ======================================================
// CLIENT DISCORD
// ======================================================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.on("ready", () => {
  console.log("✅ EVENT ready disparado.");
});

client.once("clientReady", async () => {
  console.log(`✅ BOT REALMENTE ONLINE: ${client.user.tag}`);
});

// Logs de gateway / discord.js
client.on("warn", (m) => console.warn("⚠️ WARN:", m));
client.on("error", (e) => console.error("🔥 CLIENT ERROR:", e));
client.on("debug", (m) => {
  if (
    m.includes("Heartbeat acknowledged") ||
    m.includes("Preparing to connect") ||
    m.includes("Session Limit Information") ||
    m.includes("Identifying")
  ) {
    console.log("🧠 DEBUG:", m);
  }
});

client.on("shardError", (e, shardId) => console.error(`🔥 SHARD ${shardId} ERROR:`, e));
client.on("shardDisconnect", (event, shardId) =>
  console.warn(`⚠️ SHARD ${shardId} DISCONNECT:`, event?.reason || event)
);
client.on("shardReconnecting", (shardId) => console.warn(`♻️ SHARD ${shardId} RECONNECTING...`));
client.on("shardResume", (shardId, replayedEvents) =>
  console.log(`✅ SHARD ${shardId} RESUMED. replayedEvents=${replayedEvents}`)
);
client.on("invalidated", () => console.error("🔥 CLIENT INVALIDATED"));

client.on("ready", () => {
  console.log("✅ EVENT ready disparado.");
});

client.on("guildCreate", (guild) => {
  console.log(`🏠 Entrou/confirmou guild: ${guild.name} (${guild.id})`);
});

client.on("interactionCreate", () => {
  LAST_HEARTBEAT_AT = new Date();
});

// Heartbeat de processo
setInterval(() => {
  LAST_HEARTBEAT_AT = new Date();
  console.log("💓 PROCESS HEARTBEAT", {
    at: LAST_HEARTBEAT_AT.toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    guilds: client.guilds.cache.size,
    wsStatus: client.ws.status,
    readyUser: client.user?.tag || null,
  });
}, 60_000);

// ======================================================
// CONFIGURE AQUI (IDs)
// ======================================================
const ROLE_00_ID = "1477850489189044365";
const ROLE_GERENTE_ID = "1477779548484538539";
const ROLE_MEMBRO_ID = "1477868954658541620";

const FARME_CATEGORY_ID = "1478986272520274001";
const LOG_CHANNEL_ID = "1478991741766864906";
const REPORT_CHANNEL_ID = "1479024598166012007";
const STAFF_TABLE_CHANNEL_ID = "1479158423684649167";
const LEADERBOARD_CHANNEL_ID = "1479185447367479389";
const PRODUCTIVITY_CHANNEL_ID = "1479185862196461638";

const CLOSED_CATEGORY_ID = "";
const COOLDOWN_SECONDS = 60;
const CLEANUP_EVERY_MS = 6 * 60 * 60 * 1000;
const DELETE_CLOSED_OLDER_THAN_DAYS = 14;
const DELETE_PENDING_OLDER_THAN_DAYS = 7;
const TZ = "America/Cuiaba";

// ======================================================
// DM DIÁRIO
// ======================================================
const USER_ID_MEMBRO = "1477868954658541620";
const USER_ID_GERENTE = "";
const USER_ID_00 = "";
const USER_ID_01 = "";
const USER_ID_GERENTE_ACAO = "";
const USER_ID_NOVATO = "";

function dmWhitelist() {
  return [
    USER_ID_MEMBRO,
    USER_ID_GERENTE,
    USER_ID_00,
    USER_ID_01,
    USER_ID_GERENTE_ACAO,
    USER_ID_NOVATO,
  ].filter(Boolean);
}

function canSendDailyDMTo(userId) {
  return dmWhitelist().includes(userId);
}

// ======================================================
// OPÇÕES DO /farme
// ======================================================
const FARME_OPTIONS = [
  { label: "Pasta Base", value: "pasta-base", description: "Canal privado: Pasta Base" },
  { label: "Estabilizador", value: "estabilizador", description: "Canal privado: Estabilizador" },
  { label: "Saco Ziplock", value: "saco-ziplock", description: "Canal privado: Saco Ziplock" },
  { label: "Folha Bruta", value: "folha-bruta", description: "Canal privado: Folha Bruta" },
];

// ======================================================
// DB JSON
// ======================================================
const DB_PATH = path.join(__dirname, "db.json");

function emptyDB() {
  return {
    requests: {},
    totals: {},
    channels: {},
    cooldowns: {},
    daily: {},
    decisions: [],
    fixed: {
      leaderboardMessageId: null,
      productivityMessageByUser: {},
    },
  };
}

function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const init = emptyDB();
      fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2), "utf8");
      console.log("🆕 db.json criado do zero.");
      return init;
    }

    const raw = fs.readFileSync(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed.daily) parsed.daily = {};
    if (!parsed.decisions) parsed.decisions = [];
    if (!parsed.fixed) parsed.fixed = {};
    if (!parsed.fixed.productivityMessageByUser) parsed.fixed.productivityMessageByUser = {};
    if (!("leaderboardMessageId" in parsed.fixed)) parsed.fixed.leaderboardMessageId = null;

    console.log("✅ db.json carregado.");
    return parsed;
  } catch (e) {
    console.error("❌ Falha ao carregar db.json:", e);
    return emptyDB();
  }
}

function saveDB() {
  try {
    const tempPath = `${DB_PATH}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tempPath, DB_PATH);
  } catch (e) {
    console.error("❌ Falha ao salvar db.json:", e);
  }
}

let db = loadDB();

// ======================================================
// COMMANDS
// ======================================================
const commands = [
  new SlashCommandBuilder().setName("farme").setDescription("Abra o menu e crie seu canal privado de farme."),

  new SlashCommandBuilder()
    .setName("enviarfarme")
    .setDescription("Enviar seu farme (quantidade + print) para aprovação.")
    .addIntegerOption((opt) =>
      opt.setName("quantidade").setDescription("Quantidade farmada (ex: 60)").setRequired(true).setMinValue(1)
    )
    .addAttachmentOption((opt) =>
      opt.setName("print").setDescription("Envie o print/anexo como prova").setRequired(true)
    ),

  new SlashCommandBuilder().setName("meusfarmes").setDescription("Mostra sua tabela de farmes (por item e total)."),

  new SlashCommandBuilder().setName("ranking").setDescription("Mostra o ranking geral de farmes (top 10)."),

  new SlashCommandBuilder()
    .setName("gerenciarcanal")
    .setDescription("(Staff) Abre painel para Fechar/Encerrar/Ajustar o canal atual."),

  new SlashCommandBuilder()
    .setName("testardiario")
    .setDescription("(Staff) Posta no canal staff a tabela por cargos (Membro/Gerente/00).")
    .addStringOption((opt) =>
      opt
        .setName("dia")
        .setDescription('Escolha: "hoje", "ontem" ou "data" (YYYY-MM-DD)')
        .setRequired(true)
        .addChoices(
          { name: "hoje", value: "hoje" },
          { name: "ontem", value: "ontem" },
          { name: "data (YYYY-MM-DD)", value: "data" }
        )
    )
    .addStringOption((opt) =>
      opt.setName("data").setDescription('Se "dia" = data, coloque aqui: YYYY-MM-DD').setRequired(false)
    ),

  new SlashCommandBuilder().setName("ajuda").setDescription("Mostra os comandos disponíveis para o seu cargo."),
].map((c) => c.toJSON());

async function registerCommands() {
  try {
    if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID || !process.env.GUILD_ID) {
      console.log("⚠️ ENV faltando! Configure no Render: DISCORD_TOKEN, CLIENT_ID, GUILD_ID");
      return false;
    }

    console.log("🛠️ Registrando slash commands...");
    console.log("CLIENT_ID:", process.env.CLIENT_ID);
    console.log("GUILD_ID:", process.env.GUILD_ID);

    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
      body: commands,
    });

    console.log("✅ Slash commands registrados no servidor!");
    return true;
  } catch (err) {
    console.error("❌ ERRO ao registrar commands:", err?.rawError || err);
    return false;
  }
}

// ======================================================
// HELPERS
// ======================================================
function slugUser(u) {
  return u.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
}

function is00(member) {
  return !!member?.roles?.cache?.has(ROLE_00_ID);
}

function isStaff(member) {
  if (!member) return false;
  return member.roles.cache.has(ROLE_00_ID) || member.roles.cache.has(ROLE_GERENTE_ID);
}

function isInTrackedRoles(member) {
  if (!member) return false;
  if (member.user?.bot) return false;
  const roles = member.roles?.cache;
  return roles?.has(ROLE_MEMBRO_ID) || roles?.has(ROLE_GERENTE_ID) || roles?.has(ROLE_00_ID);
}

function parseItemFromChannelName(channelName) {
  if (!channelName?.startsWith("farme-")) return null;
  const parts = channelName.split("-");
  if (parts.length < 3) return null;
  const item = parts.slice(1, parts.length - 1).join("-");
  return FARME_OPTIONS.find((o) => o.value === item) ?? null;
}

function ensureUserTotals(userId) {
  if (!db.totals[userId]) db.totals[userId] = { total: 0, items: {} };
  if (!db.totals[userId].items) db.totals[userId].items = {};
}

function addTotals(userId, itemValue, quantidade) {
  ensureUserTotals(userId);
  db.totals[userId].total += quantidade;
  db.totals[userId].items[itemValue] = (db.totals[userId].items[itemValue] || 0) + quantidade;

  if (db.totals[userId].total < 0) db.totals[userId].total = 0;
  if (db.totals[userId].items[itemValue] < 0) db.totals[userId].items[itemValue] = 0;

  saveDB();
}

function setCooldown(userId) {
  db.cooldowns[userId] = Date.now();
  saveDB();
}

function getCooldownRemaining(userId) {
  const last = db.cooldowns[userId] || 0;
  const elapsed = (Date.now() - last) / 1000;
  const remaining = COOLDOWN_SECONDS - elapsed;
  return remaining > 0 ? Math.ceil(remaining) : 0;
}

function channelLink(guildId, channelId) {
  return `https://discord.com/channels/${guildId}/${channelId}`;
}

function makeRequestEmbed({ userTag, userId, itemLabel, quantidade, status, approverTag, reason, adjustedInfo }) {
  const embed = new EmbedBuilder()
    .setTitle("📦 Solicitação de Farme")
    .setDescription("Detalhes da solicitação abaixo.")
    .addFields(
      { name: "👤 Membro", value: `<@${userId}> (${userTag})`, inline: false },
      { name: "🧾 Item", value: itemLabel, inline: true },
      { name: "🔢 Quantidade", value: String(quantidade), inline: true },
      { name: "📌 Status", value: status, inline: true }
    )
    .setTimestamp(new Date());

  if (approverTag) embed.addFields({ name: "✅ Avaliado por", value: approverTag, inline: false });
  if (reason) embed.addFields({ name: "📝 Motivo", value: reason, inline: false });
  if (adjustedInfo) embed.addFields({ name: "🛠️ Ajuste (00)", value: adjustedInfo, inline: false });

  return embed;
}

function publicButtons({ disabled = false } = {}) {
  const approve = new ButtonBuilder()
    .setCustomId("farme_public_aprovar")
    .setLabel("Aprovar")
    .setStyle(ButtonStyle.Success)
    .setDisabled(disabled);

  const deny = new ButtonBuilder()
    .setCustomId("farme_public_negar")
    .setLabel("Negar")
    .setStyle(ButtonStyle.Danger)
    .setDisabled(disabled);

  return new ActionRowBuilder().addComponents(approve, deny);
}

function staffPanelButtons(requestId, canAdjust) {
  const close = new ButtonBuilder()
    .setCustomId(`farme_staff_fechar:${requestId}`)
    .setLabel("Fechar Canal")
    .setStyle(ButtonStyle.Secondary);

  const end = new ButtonBuilder()
    .setCustomId(`farme_staff_encerrar:${requestId}`)
    .setLabel("Encerrar (Deletar)")
    .setStyle(ButtonStyle.Danger);

  const adjust = new ButtonBuilder()
    .setCustomId(`farme_staff_ajustar:${requestId}`)
    .setLabel("Ajustar (00)")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(!canAdjust);

  return new ActionRowBuilder().addComponents(close, end, adjust);
}

async function safeReply(interaction, payload) {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(payload);
    }
    return await interaction.reply(payload);
  } catch (e) {
    console.error("❌ safeReply falhou:", e);
  }
}

async function safeEditReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }
    return await interaction.reply(payload);
  } catch (e) {
    console.error("❌ safeEditReply falhou:", e);
  }
}

async function sendLog(guild, content, embed) {
  const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (logChannel && logChannel.isTextBased()) {
    await logChannel.send({ content, embeds: embed ? [embed] : [] }).catch((e) => {
      console.error("❌ sendLog falhou:", e);
    });
  }
}

async function sendReport(guild, content, embeds = []) {
  const ch = await guild.channels.fetch(REPORT_CHANNEL_ID).catch(() => null);
  if (ch && ch.isTextBased()) {
    await ch.send({ content, embeds }).catch((e) => {
      console.error("❌ sendReport falhou:", e);
    });
  }
}

async function sendStaffTable(guild, content, embeds = []) {
  const ch = await guild.channels.fetch(STAFF_TABLE_CHANNEL_ID).catch(() => null);
  if (ch && ch.isTextBased()) {
    await ch.send({ content, embeds }).catch((e) => {
      console.error("❌ sendStaffTable falhou:", e);
    });
    return true;
  }
  return false;
}

async function safeDailyDM(userId, text) {
  if (!canSendDailyDMTo(userId)) return;
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return;
  await user.send(text).catch((e) => {
    console.error(`❌ DM diária falhou para ${userId}:`, e?.message || e);
  });
}

async function safeNotifyDM(userId, text) {
  const user = await client.users.fetch(userId).catch(() => null);
  if (!user) return;
  await user.send(text).catch((e) => {
    console.error(`❌ safeNotifyDM falhou para ${userId}:`, e?.message || e);
  });
}

function daysToMs(d) {
  return d * 24 * 60 * 60 * 1000;
}

function cleanupDB() {
  try {
    const now = Date.now();
    const closedCutoff = now - daysToMs(DELETE_CLOSED_OLDER_THAN_DAYS);
    const pendingCutoff = now - daysToMs(DELETE_PENDING_OLDER_THAN_DAYS);

    let removed = 0;

    for (const [rid, req] of Object.entries(db.requests || {})) {
      const createdAt = req?.createdAt || 0;

      if (req.status === "closed" && createdAt < closedCutoff) {
        delete db.requests[rid];
        removed++;
        continue;
      }

      if (req.status === "pending" && createdAt < pendingCutoff) {
        delete db.requests[rid];
        removed++;
        continue;
      }
    }

    if (removed > 0) {
      saveDB();
      console.log(`🧹 Cleanup DB: removi ${removed} requests antigos.`);
    }
  } catch (e) {
    console.error("❌ Cleanup falhou:", e);
  }
}

// ======================================================
// CONTROLE DIÁRIO
// ======================================================
function dateKeyNow() {
  return DateTime.now().setZone(TZ).toISODate();
}

function resolveDateKeyFromOption({ dia, dataStr }) {
  const now = DateTime.now().setZone(TZ);

  if (dia === "hoje") return now.toISODate();
  if (dia === "ontem") return now.minus({ days: 1 }).toISODate();

  const raw = (dataStr || "").trim();
  const dt = DateTime.fromISO(raw, { zone: TZ });
  if (!dt.isValid) return null;

  return dt.toISODate();
}

function ensureDaily(dateKey, userId) {
  if (!db.daily[dateKey]) db.daily[dateKey] = {};
  if (!db.daily[dateKey][userId]) db.daily[dateKey][userId] = {};
}

function markApprovedToday(userId, itemValue) {
  const dk = dateKeyNow();
  ensureDaily(dk, userId);
  db.daily[dk][userId][itemValue] = (db.daily[dk][userId][itemValue] || 0) + 1;
  saveDB();
}

function getApprovedCount(dateKey, userId, itemValue) {
  return db.daily?.[dateKey]?.[userId]?.[itemValue] || 0;
}

function missStreakUntil(dateKey, userId, itemValue, maxLookbackDays = 120) {
  const base = DateTime.fromISO(dateKey, { zone: TZ });
  if (!base.isValid) return 0;

  const todayCount = getApprovedCount(dateKey, userId, itemValue);
  if (todayCount >= 1) return 0;

  let streak = 0;
  for (let i = 0; i < maxLookbackDays; i++) {
    const dk = base.minus({ days: i }).toISODate();
    const n = getApprovedCount(dk, userId, itemValue);
    if (n >= 1) break;
    streak++;
  }

  return streak;
}

function splitIntoPages(rows, maxLen = 3500) {
  const pages = [];
  let current = "";

  for (const r of rows) {
    const add = (current ? "\n\n" : "") + r;
    if ((current + add).length > maxLen) {
      pages.push(current);
      current = r;
    } else {
      current += add;
    }
  }

  if (current) pages.push(current);
  return pages;
}

function buildStaffRow(userId, displayName, dateKey) {
  const doneLine = FARME_OPTIONS.map((o) => `${o.label}: ${getApprovedCount(dateKey, userId, o.value)}`).join(" | ");
  const rotaCompletaLine = FARME_OPTIONS
    .map((o) => `${o.label}: ${missStreakUntil(dateKey, userId, o.value)}`)
    .join(" | ");

  return (
    `👤 **${displayName}** (<@${userId}>)\n` +
    `✅ **Rotas no dia:** ${doneLine}\n` +
    `📌 **Rota completa:** ${rotaCompletaLine}`
  );
}

function getHelpEmbedFor(member) {
  const is_00 = is00(member);
  const is_staff = isStaff(member);

  const memberCmds = [
    { name: "/farme", desc: "Abrir menu e criar/abrir canal privado do item." },
    { name: "/enviarfarme", desc: "Enviar farme (quantidade + print) para aprovação." },
    { name: "/meusfarmes", desc: "Ver sua tabela de farmes aprovados." },
    { name: "/ranking", desc: "Ver ranking (top 10)." },
    { name: "/ajuda", desc: "Ver comandos disponíveis para você." },
  ];

  const gerenteCmds = [
    { name: "/gerenciarcanal", desc: "Painel staff: fechar/encerrar (e ajustar se for 00)." },
    { name: "/testardiario", desc: "Tabela staff (hoje/ontem/data) por cargos." },
  ];

  const extra00Cmds = [{ name: "Ajustar (00)", desc: "No painel do canal: botão Ajustar (00) após aprovar/negar." }];

  const embed = new EmbedBuilder()
    .setTitle("🧭 Ajuda do Bot (comandos disponíveis)")
    .setDescription(is_00 ? "Você é **00** (vê tudo)." : is_staff ? "Você é **Gerente**." : "Você é **Membro**.")
    .setTimestamp(new Date());

  const fmt = (arr) => arr.map((c) => `• **${c.name}** — ${c.desc}`).join("\n");

  embed.addFields({ name: "👤 Comandos de Membro", value: fmt(memberCmds), inline: false });
  if (is_staff) embed.addFields({ name: "🛡️ Comandos de Gerente/Staff", value: fmt(gerenteCmds), inline: false });
  if (is_00) embed.addFields({ name: "👑 Extras do 00", value: fmt(extra00Cmds), inline: false });

  return embed;
}

// ======================================================
// LEADERBOARD FIXA
// ======================================================
function buildLeaderboardEmbed(guild) {
  const entries = Object.entries(db.totals || {})
    .map(([userId, t]) => ({ userId, total: t?.total || 0 }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const desc = entries.length
    ? entries
        .map((e, i) => {
          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🔸";
          return `${medal} **${i + 1}.** <@${e.userId}> — **${e.total}**`;
        })
        .join("\n")
    : "Ainda não tem farmes aprovados.";

  return new EmbedBuilder()
    .setTitle("🏆 Leaderboard de Farmes (fixa)")
    .setDescription(desc)
    .setFooter({ text: `Atualizado automaticamente • Servidor: ${guild.name}` })
    .setTimestamp(new Date());
}

async function updateLeaderboardFixed(guild) {
  const channel = await guild.channels.fetch(LEADERBOARD_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = buildLeaderboardEmbed(guild);
  const existingId = db.fixed?.leaderboardMessageId || null;

  if (existingId) {
    const msg = await channel.messages.fetch(existingId).catch(() => null);
    if (msg) {
      await msg.edit({ content: "📌 **Ranking fixo (auto)**", embeds: [embed] }).catch((e) => {
        console.error("❌ updateLeaderboardFixed edit falhou:", e);
      });
      return;
    }
  }

  const created = await channel.send({ content: "📌 **Ranking fixo (auto)**", embeds: [embed] }).catch((e) => {
    console.error("❌ updateLeaderboardFixed send falhou:", e);
    return null;
  });

  if (created) {
    db.fixed.leaderboardMessageId = created.id;
    saveDB();
  }
}

// ======================================================
// PRODUTIVIDADE
// ======================================================
function buildProductivityEmbedFor(guild, userId) {
  ensureUserTotals(userId);
  const totals = db.totals[userId];

  const items = FARME_OPTIONS
    .map((o) => ({ label: o.label, value: o.value, n: totals.items[o.value] || 0 }))
    .filter((x) => x.n > 0);

  const lines = items.length
    ? items.map((x) => `• **${x.label}:** ${x.n}`).join("\n")
    : "— (ainda não tem farmes aprovados)";

  return new EmbedBuilder()
    .setTitle("📊 Painel de Produtividade")
    .setDescription(`👤 <@${userId}>\n\n${lines}`)
    .addFields({ name: "🏁 Total", value: String(totals.total || 0), inline: true })
    .setFooter({ text: `Atualiza quando aprova/ajusta • ${guild.name}` })
    .setTimestamp(new Date());
}

async function updateProductivityPanelFor(guild, userId) {
  const channel = await guild.channels.fetch(PRODUCTIVITY_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const embed = buildProductivityEmbedFor(guild, userId);
  const map = db.fixed.productivityMessageByUser || {};
  const existingId = map[userId] || null;

  if (existingId) {
    const msg = await channel.messages.fetch(existingId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [embed] }).catch((e) => {
        console.error("❌ updateProductivityPanelFor edit falhou:", e);
      });
      return;
    }
  }

  const created = await channel.send({ embeds: [embed] }).catch((e) => {
    console.error("❌ updateProductivityPanelFor send falhou:", e);
    return null;
  });

  if (created) {
    db.fixed.productivityMessageByUser[userId] = created.id;
    saveDB();
  }
}

async function updatePanelsAfterChange(guild, userId) {
  await updateLeaderboardFixed(guild).catch((e) => console.error("❌ leaderboard fail:", e));
  await updateProductivityPanelFor(guild, userId).catch((e) => console.error("❌ productivity fail:", e));
}

// ======================================================
// JOB DIÁRIO
// ======================================================
async function runDailyAuditAndReport() {
  const dk = DateTime.now().setZone(TZ).minus({ days: 1 }).toISODate();
  const whitelist = dmWhitelist();

  console.log(`📅 runDailyAuditAndReport iniciado para ${dk}. Whitelist=${whitelist.length}`);

  for (const guild of client.guilds.cache.values()) {
    console.log(`📍 Processando guild ${guild.name} (${guild.id})`);

    for (const userId of whitelist) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) continue;

      const dmText =
        `📅 **Meta diária (${dk})**\n\n` +
        `📌 (Use /testardiario para ver tabela completa no canal staff.)\n`;

      await safeDailyDM(userId, dmText);
    }

    await sendReport(guild, `✅ Relatório diário gerado (${dk}).`);
  }

  console.log("✅ runDailyAuditAndReport finalizado.");
}

// ======================================================
// READY
// ======================================================
async function onReadyBoot() {
  if (READY_RAN) {
    console.log("ℹ️ onReadyBoot já rodou antes. Ignorando boot duplicado.");
    return;
  }

  READY_RAN = true;
  READY_AT = new Date();

  console.log("==================================================");
  console.log(`✅ BOT REALMENTE ONLINE: ${client.user.tag}`);
  console.log(`🕒 READY_AT: ${READY_AT.toISOString()}`);
  console.log(`🏠 Guilds conectadas: ${client.guilds.cache.size}`);
  console.log("==================================================");

  cleanupDB();
  setInterval(cleanupDB, CLEANUP_EVERY_MS);

  if (!CRON_STARTED) {
    CRON_STARTED = true;

    cron.schedule(
      "5 3 * * *",
      async () => {
        console.log("⏰ CRON diário disparou.");
        await runDailyAuditAndReport().catch((e) => console.error("❌ Daily job error:", e));
      },
      { timezone: TZ }
    );

    cron.schedule(
      "*/5 * * * *",
      async () => {
        console.log("🔄 CRON leaderboard 5/5 min disparou.");
        for (const guild of client.guilds.cache.values()) {
          await updateLeaderboardFixed(guild).catch((e) => console.error("❌ leaderboard cron fail:", e));
        }
      },
      { timezone: TZ }
    );
  }

  for (const guild of client.guilds.cache.values()) {
    await updateLeaderboardFixed(guild).catch((e) => console.error("❌ ready leaderboard fail:", e));
  }

  console.log(`⏰ Daily job: 03:05 (${TZ}) | Auto refresh leaderboard: 5 em 5 min`);
}

client.once("clientReady", async () => {
  await onReadyBoot().catch((e) => {
    console.error("❌ onReadyBoot falhou:", e);
  });
});

// ======================================================
// INTERACTIONS
// ======================================================
client.on("interactionCreate", async (interaction) => {
  try {
    LAST_HEARTBEAT_AT = new Date();

    if (interaction.isChatInputCommand() && interaction.commandName === "ajuda") {
      const embed = getHelpEmbedFor(interaction.member);
      return safeReply(interaction, { embeds: [embed], ephemeral: true });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "testardiario") {
      if (!isStaff(interaction.member)) {
        return safeReply(interaction, { content: "❌ Apenas 00/Gerente.", ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const dia = interaction.options.getString("dia", true);
      const dataStr = interaction.options.getString("data", false);

      const dk = resolveDateKeyFromOption({ dia, dataStr });
      if (!dk) {
        return safeEditReply(interaction, {
          content: "❌ Data inválida. Use: **YYYY-MM-DD** (ex: 2026-03-05).",
        });
      }

      const guild = interaction.guild;
      await guild.members.fetch().catch(() => null);

      const targets = guild.members.cache
        .filter((m) => isInTrackedRoles(m))
        .map((m) => m)
        .sort((a, b) => (a.displayName || a.user.username).localeCompare(b.displayName || b.user.username));

      const rows = targets.map((m) => buildStaffRow(m.user.id, m.displayName || m.user.username, dk));

      const header =
        `📌 **Tabela de metas** solicitada por <@${interaction.user.id}> — Data: **${dk}**\n` +
        `Cargos: <@&${ROLE_MEMBRO_ID}> | <@&${ROLE_GERENTE_ID}> | <@&${ROLE_00_ID}>\n` +
        `Total encontrados: **${targets.length}**\n` +
        `Legenda: **Rotas no dia** = quantas aprovadas naquele dia | **Rota completa** = dias seguidos faltando (0 se fez no dia).`;

      const pages = splitIntoPages(rows.length ? rows : ["⚠️ Ninguém encontrado nesses cargos."], 3500);
      const embeds = pages.slice(0, 8).map((txt, idx) =>
        new EmbedBuilder()
          .setTitle(`📊 Controle de metas (${dk})${pages.length > 1 ? ` — Parte ${idx + 1}/${pages.length}` : ""}`)
          .setDescription(txt)
          .setTimestamp(new Date())
      );

      await sendStaffTable(guild, header, embeds);
      return safeEditReply(interaction, { content: `✅ Postei a tabela no canal staff <#${STAFF_TABLE_CHANNEL_ID}>.` });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "farme") {
      const menu = new StringSelectMenuBuilder()
        .setCustomId("farme_menu")
        .setPlaceholder("Escolha uma opção…")
        .addOptions(FARME_OPTIONS);

      return safeReply(interaction, {
        content: "Selecione a opção para criar/abrir seu canal privado:",
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true,
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "gerenciarcanal") {
      if (!isStaff(interaction.member)) {
        return safeReply(interaction, { content: "❌ Apenas 00/Gerente.", ephemeral: true });
      }

      const channelId = interaction.channelId;
      const reqs = Object.values(db.requests || {}).filter((r) => r.channelId === channelId);

      if (!reqs.length) {
        return safeReply(interaction, {
          content: "❌ Não encontrei nenhum pedido salvo para este canal.",
          ephemeral: true,
        });
      }

      reqs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      const latest = reqs[0];

      return safeReply(interaction, {
        content: `🛠️ Painel do canal atual (Pedido: ${latest.status})`,
        components: [staffPanelButtons(latest.requestId, is00(interaction.member))],
        ephemeral: true,
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "farme_menu") {
      const selected = interaction.values[0];
      const opt = FARME_OPTIONS.find((o) => o.value === selected);

      const channelName = `farme-${selected}-${slugUser(interaction.user)}`.slice(0, 90);

      const existing = interaction.guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildText && c.name === channelName
      );

      const targetChannel = existing
        ? existing
        : await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: FARME_CATEGORY_ID || null,
            permissionOverwrites: [
              { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
              {
                id: interaction.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.AttachFiles,
                ],
              },
              {
                id: ROLE_00_ID,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageMessages,
                  PermissionFlagsBits.ManageChannels,
                ],
              },
              {
                id: ROLE_GERENTE_ID,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.ManageMessages,
                  PermissionFlagsBits.ManageChannels,
                ],
              },
            ],
            topic: `Canal privado de ${interaction.user.tag} - ${opt?.label ?? selected}`,
          });

      db.channels[interaction.user.id] = db.channels[interaction.user.id] || {};
      db.channels[interaction.user.id][selected] = targetChannel.id;
      saveDB();

      if (!existing) {
        await targetChannel.send(
          `👋 ${interaction.user}\n` +
            `✅ Canal privado de **${opt?.label ?? selected}** criado.\n\n` +
            `📌 Envie seu farme usando:\n` +
            `**/enviarfarme quantidade: <número> print: <anexo>**`
        );
      }

      const goBtn = new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel("➡️ Ir para o canal")
        .setURL(channelLink(interaction.guild.id, targetChannel.id));

      return safeReply(interaction, {
        content: existing ? "✅ Seu canal já existe.\nClique para abrir agora:" : "✅ Canal criado.\nClique para abrir agora:",
        components: [new ActionRowBuilder().addComponents(goBtn)],
        ephemeral: true,
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "enviarfarme") {
      const opt = parseItemFromChannelName(interaction.channel?.name);

      if (!opt) {
        return safeReply(interaction, {
          content: "❌ Use este comando dentro do seu canal de farme (farme-...-seunome).",
          ephemeral: true,
        });
      }

      const remaining = getCooldownRemaining(interaction.user.id);
      if (remaining > 0) {
        return safeReply(interaction, {
          content: `⏳ Aguarde **${remaining}s** para enviar outro farme.`,
          ephemeral: true,
        });
      }

      const quantidade = interaction.options.getInteger("quantidade", true);
      const print = interaction.options.getAttachment("print", true);

      if (!print.contentType?.startsWith("image/")) {
        return safeReply(interaction, {
          content: "❌ O anexo precisa ser uma **imagem/print**.",
          ephemeral: true,
        });
      }

      setCooldown(interaction.user.id);

      const embed = makeRequestEmbed({
        userTag: interaction.user.tag,
        userId: interaction.user.id,
        itemLabel: opt.label,
        quantidade,
        status: "🟡 Pendente",
      }).setImage(print.url);

      const msg = await interaction.channel.send({
        content: `📣 Solicitação enviada por ${interaction.user}. (Aguardando **00/Gerente**)`,
        embeds: [embed],
        components: [publicButtons({ disabled: false })],
      });

      const requestId = msg.id;

      db.requests[requestId] = {
        requestId,
        messageId: msg.id,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        itemValue: opt.value,
        itemLabel: opt.label,
        quantidade,
        originalQuantidade: quantidade,
        printUrl: print.url,
        status: "pending",
        createdAt: Date.now(),
        decidedAt: null,
        decidedById: null,
        decidedByTag: null,
        denyReason: null,
        adjustedAt: null,
        adjustedById: null,
        adjustedByTag: null,
        adjustedDelta: 0,
        adjustedNote: null,
        closedAt: null,
        closedById: null,
        closedByTag: null,
      };

      saveDB();

      return safeReply(interaction, {
        content: "✅ Enviado! Aguarde aprovação do 00/Gerente.",
        ephemeral: true,
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "meusfarmes") {
      ensureUserTotals(interaction.user.id);
      const totals = db.totals[interaction.user.id];

      const lines = FARME_OPTIONS.map((o) => `• **${o.label}**: ${totals.items[o.value] || 0}`).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📊 Sua Tabela de Farmes")
        .setDescription(lines)
        .addFields({ name: "🏁 Total", value: String(totals.total), inline: false })
        .setTimestamp(new Date());

      return safeReply(interaction, { embeds: [embed], ephemeral: true });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "ranking") {
      const entries = Object.entries(db.totals || {})
        .map(([userId, t]) => ({ userId, total: t.total || 0 }))
        .filter((x) => x.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      if (entries.length === 0) {
        return safeReply(interaction, {
          content: "Ainda não tem farmes aprovados no ranking.",
          ephemeral: true,
        });
      }

      const desc = entries.map((e, i) => `**${i + 1}.** <@${e.userId}> — **${e.total}**`).join("\n");
      const embed = new EmbedBuilder().setTitle("🏆 Ranking de Farmes (Top 10)").setDescription(desc).setTimestamp(new Date());

      return safeReply(interaction, { embeds: [embed], ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === "farme_public_aprovar") {
      await interaction.deferReply({ ephemeral: true });

      if (!isStaff(interaction.member)) {
        return safeEditReply(interaction, { content: "❌ Apenas **00** ou **Gerente** pode aprovar/negar." });
      }

      const requestId = interaction.message.id;
      const req = db.requests[requestId];

      if (!req) return safeEditReply(interaction, { content: "❌ Não encontrei essa solicitação no histórico (db)." });

      if (req.status !== "pending") {
        return safeEditReply(interaction, {
          content: "⚠️ Esse pedido já foi avaliado. Painel staff:",
          components: [staffPanelButtons(requestId, is00(interaction.member))],
        });
      }

      req.status = "approved";
      req.decidedAt = Date.now();
      req.decidedById = interaction.user.id;
      req.decidedByTag = interaction.user.tag;
      saveDB();

      markApprovedToday(req.userId, req.itemValue);
      addTotals(req.userId, req.itemValue, req.quantidade);

      const embed = makeRequestEmbed({
        userTag: req.userTag,
        userId: req.userId,
        itemLabel: req.itemLabel,
        quantidade: req.quantidade,
        status: "🟢 Aprovado",
        approverTag: req.decidedByTag,
        adjustedInfo: req.adjustedNote || null,
      }).setImage(req.printUrl);

      await interaction.message.edit({
        content: `📣 Pedido aprovado por **${req.decidedByTag}**.`,
        embeds: [embed],
        components: [publicButtons({ disabled: true })],
      });

      await safeNotifyDM(
        req.userId,
        `✅ Seu farme foi **APROVADO**.\nItem: **${req.itemLabel}**\nQuantidade: **${req.quantidade}**\nAprovado por: **${req.decidedByTag}**`
      );

      await sendLog(
        interaction.guild,
        `🟢 Aprovado | Membro: <@${req.userId}> | Por: <@${interaction.user.id}>\nItem: **${req.itemLabel}** | Quantidade: **${req.quantidade}**`,
        embed
      );

      await updatePanelsAfterChange(interaction.guild, req.userId);

      return safeEditReply(interaction, {
        content: "✅ Aprovado. Painel staff:",
        components: [staffPanelButtons(requestId, is00(interaction.member))],
      });
    }

    if (interaction.isButton() && interaction.customId === "farme_public_negar") {
      if (!isStaff(interaction.member)) {
        return safeReply(interaction, {
          content: "❌ Apenas **00** ou **Gerente** pode aprovar/negar.",
          ephemeral: true,
        });
      }

      const requestId = interaction.message.id;
      const req = db.requests[requestId];

      if (!req) {
        return safeReply(interaction, {
          content: "❌ Pedido não encontrado no db.",
          ephemeral: true,
        });
      }

      if (req.status !== "pending") {
        return safeReply(interaction, {
          content: "⚠️ Esse pedido já foi avaliado.",
          components: [staffPanelButtons(requestId, is00(interaction.member))],
          ephemeral: true,
        });
      }

      const modal = new ModalBuilder().setCustomId(`farme_modal_negar:${requestId}`).setTitle("Motivo da negação");

      const reasonInput = new TextInputBuilder()
        .setCustomId("deny_reason")
        .setLabel("Explique o motivo (obrigatório)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("farme_modal_negar:")) {
      await interaction.deferReply({ ephemeral: true });

      if (!isStaff(interaction.member)) {
        return safeEditReply(interaction, { content: "❌ Apenas **00** ou **Gerente** pode negar." });
      }

      const requestId = interaction.customId.split(":")[1];
      const req = db.requests[requestId];

      if (!req) return safeEditReply(interaction, { content: "❌ Pedido não encontrado no db." });

      if (req.status !== "pending") {
        return safeEditReply(interaction, {
          content: "⚠️ Esse pedido já foi avaliado. Painel staff:",
          components: [staffPanelButtons(requestId, is00(interaction.member))],
        });
      }

      const reason = interaction.fields.getTextInputValue("deny_reason")?.trim();
      if (!reason) return safeEditReply(interaction, { content: "❌ Motivo vazio." });

      req.status = "denied";
      req.decidedAt = Date.now();
      req.decidedById = interaction.user.id;
      req.decidedByTag = interaction.user.tag;
      req.denyReason = reason;
      saveDB();

      const embed = makeRequestEmbed({
        userTag: req.userTag,
        userId: req.userId,
        itemLabel: req.itemLabel,
        quantidade: req.quantidade,
        status: "🔴 Negado",
        approverTag: req.decidedByTag,
        reason,
        adjustedInfo: req.adjustedNote || null,
      }).setImage(req.printUrl);

      const channel = await interaction.guild.channels.fetch(req.channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const msg = await channel.messages.fetch(req.messageId).catch(() => null);
        if (msg) {
          await msg.edit({
            content: `📣 Pedido negado por **${req.decidedByTag}**.`,
            embeds: [embed],
            components: [publicButtons({ disabled: true })],
          }).catch(() => {});
        }
      }

      await safeNotifyDM(
        req.userId,
        `❌ Seu farme foi **NEGADO**.\nItem: **${req.itemLabel}**\nQuantidade: **${req.quantidade}**\nNegado por: **${req.decidedByTag}**\nMotivo: **${reason}**`
      );

      await sendLog(
        interaction.guild,
        `🔴 Negado | Membro: <@${req.userId}> | Por: <@${interaction.user.id}>\nItem: **${req.itemLabel}** | Quantidade: **${req.quantidade}**\nMotivo: **${reason}**`,
        embed
      );

      return safeEditReply(interaction, {
        content: "✅ Negado com motivo. Painel staff:",
        components: [staffPanelButtons(requestId, is00(interaction.member))],
      });
    }

    if (interaction.isButton() && interaction.customId.startsWith("farme_staff_")) {
      const [action, requestId] = interaction.customId.split(":");
      const req = db.requests[requestId];

      if (!req) {
        return safeReply(interaction, {
          content: "❌ Pedido não encontrado no db.",
          ephemeral: true,
        });
      }

      if (!isStaff(interaction.member)) {
        return safeReply(interaction, {
          content: "❌ Apenas staff.",
          ephemeral: true,
        });
      }

      if (action === "farme_staff_ajustar") {
        if (!is00(interaction.member)) {
          return safeReply(interaction, {
            content: "❌ Apenas o **00** pode ajustar valores.",
            ephemeral: true,
          });
        }

        if (req.status === "pending") {
          return safeReply(interaction, {
            content: "❌ Ajuste só depois de aprovar/negar.",
            ephemeral: true,
          });
        }

        const modal = new ModalBuilder().setCustomId(`farme_modal_ajustar:${requestId}`).setTitle("Ajustar Farme (00)");

        const opInput = new TextInputBuilder()
          .setCustomId("op")
          .setLabel('Operação: "+", "-", ou "set"')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(4);

        const valInput = new TextInputBuilder()
          .setCustomId("val")
          .setLabel("Valor (ex: 40)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(10);

        const noteInput = new TextInputBuilder()
          .setCustomId("note")
          .setLabel("Observação (opcional)")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(200);

        modal.addComponents(
          new ActionRowBuilder().addComponents(opInput),
          new ActionRowBuilder().addComponents(valInput),
          new ActionRowBuilder().addComponents(noteInput)
        );

        return interaction.showModal(modal);
      }

      await interaction.deferReply({ ephemeral: true });

      if (action === "farme_staff_fechar") {
        if (req.status === "pending") return safeEditReply(interaction, { content: "❌ Você precisa aprovar/negar antes de fechar." });
        if (req.status === "closed") return safeEditReply(interaction, { content: "⚠️ Já está fechado. Use Encerrar." });

        const channel = await interaction.guild.channels.fetch(req.channelId).catch(() => null);
        if (!channel) return safeEditReply(interaction, { content: "❌ Canal não encontrado." });

        await channel.permissionOverwrites.edit(req.userId, { ViewChannel: false }).catch(() => {});
        if (CLOSED_CATEGORY_ID) await channel.setParent(CLOSED_CATEGORY_ID).catch(() => {});
        await channel.setName(`fechado-${channel.name}`.slice(0, 90)).catch(() => {});
        await channel.send(`🔒 Canal fechado por <@${interaction.user.id}>. (Agora só staff vê.)`).catch(() => {});

        req.status = "closed";
        req.closedAt = Date.now();
        req.closedById = interaction.user.id;
        req.closedByTag = interaction.user.tag;
        saveDB();

        return safeEditReply(interaction, {
          content: "✅ Canal fechado (sumiu pro membro). Agora você pode **Encerrar**.",
        });
      }

      if (action === "farme_staff_encerrar") {
        if (req.status !== "closed") {
          return safeEditReply(interaction, { content: "❌ Você precisa Fechar antes de Encerrar." });
        }

        const channel = await interaction.guild.channels.fetch(req.channelId).catch(() => null);
        if (!channel) {
          delete db.requests[requestId];
          saveDB();
          return safeEditReply(interaction, { content: "⚠️ Canal já não existe. Limpei do histórico." });
        }

        delete db.requests[requestId];
        saveDB();

        await safeEditReply(interaction, { content: "🗑️ Encerrando e deletando o canal..." });
        await channel.delete(`Encerrado por ${interaction.user.tag}`).catch(() => {});
        return;
      }

      return safeEditReply(interaction, { content: "⚠️ Ação desconhecida." });
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("farme_modal_ajustar:")) {
      await interaction.deferReply({ ephemeral: true });

      if (!is00(interaction.member)) {
        return safeEditReply(interaction, { content: "❌ Apenas o **00** pode ajustar." });
      }

      const requestId = interaction.customId.split(":")[1];
      const req = db.requests[requestId];

      if (!req) return safeEditReply(interaction, { content: "❌ Pedido não encontrado no db." });

      const op = (interaction.fields.getTextInputValue("op") || "").trim().toLowerCase();
      const valStr = (interaction.fields.getTextInputValue("val") || "").trim();
      const note = (interaction.fields.getTextInputValue("note") || "").trim();

      const val = parseInt(valStr, 10);

      if (!["+", "-", "set"].includes(op)) {
        return safeEditReply(interaction, { content: '❌ Operação inválida. Use: "+", "-", ou "set".' });
      }

      if (!Number.isFinite(val)) {
        return safeEditReply(interaction, { content: "❌ Valor inválido. Ex: 40" });
      }

      ensureUserTotals(req.userId);

      let delta = 0;
      if (op === "+") delta = val;
      if (op === "-") delta = -val;
      if (op === "set") delta = val - (req.quantidade || 0);

      req.quantidade = Math.max(0, (req.quantidade || 0) + delta);
      req.adjustedAt = Date.now();
      req.adjustedById = interaction.user.id;
      req.adjustedByTag = interaction.user.tag;
      req.adjustedDelta = (req.adjustedDelta || 0) + delta;
      req.adjustedNote = `Op: ${op} ${val} | Delta: ${delta}${note ? ` | Nota: ${note}` : ""}`;

      addTotals(req.userId, req.itemValue, delta);
      saveDB();

      const channel = await interaction.guild.channels.fetch(req.channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const msg = await channel.messages.fetch(req.messageId).catch(() => null);
        if (msg) {
          const statusTxt =
            req.status === "approved"
              ? "🟢 Aprovado"
              : req.status === "denied"
                ? "🔴 Negado"
                : req.status === "closed"
                  ? "🔒 Fechado"
                  : "🟡 Pendente";

          const embed = makeRequestEmbed({
            userTag: req.userTag,
            userId: req.userId,
            itemLabel: req.itemLabel,
            quantidade: req.quantidade,
            status: statusTxt,
            approverTag: req.decidedByTag || null,
            reason: req.denyReason || null,
            adjustedInfo: req.adjustedNote || null,
          }).setImage(req.printUrl);

          await msg.edit({ embeds: [embed] }).catch(() => {});
        }
      }

      await safeNotifyDM(
        req.userId,
        `🛠️ Seu farme foi **AJUSTADO** pelo 00.\nItem: **${req.itemLabel}**\nNovo valor: **${req.quantidade}**\nDetalhes: ${req.adjustedNote}`
      );

      await updatePanelsAfterChange(interaction.guild, req.userId);

      return safeEditReply(interaction, {
        content: `✅ Ajustado com sucesso. Delta aplicado: **${delta}**. Novo total do pedido: **${req.quantidade}**`,
      });
    }
  } catch (err) {
    console.error("🔥 interactionCreate ERROR:", err);

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "❌ Deu erro. Olha o console do Render.",
          ephemeral: true,
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: "❌ Deu erro. Olha o console do Render.",
          ephemeral: true,
        }).catch(() => {});
      }
    } catch {}
  }
});

// ======================================================
// START
// ======================================================
(async () => {
  try {
    console.log("🚀 Iniciando bot...");

    if (!process.env.DISCORD_TOKEN) {
      console.error("❌ DISCORD_TOKEN vazio! Configure no Render > Environment.");
      process.exit(1);
    }

    // registra commands sem travar o login
    registerCommands()
      .then((ok) => console.log(ok ? "✅ registerCommands terminou" : "⚠️ registerCommands não registrou"))
      .catch((e) => console.error("❌ registerCommands falhou:", e?.rawError || e));

    console.log("🔑 Fazendo login no Discord...");

    const loginTimeout = setTimeout(() => {
      console.error("❌ Login travou por 60s. Reiniciando processo...");
      process.exit(1);
    }, 60_000);

    client
      .login(process.env.DISCORD_TOKEN)
      .then(() => {
        clearTimeout(loginTimeout);
        console.log("✅ login() resolveu (token aceito). Aguardando READY...");
      })
      .catch((e) => {
        clearTimeout(loginTimeout);
        console.error("❌ LOGIN ERROR:", e?.rawError || e);
        process.exit(1);
      });
  } catch (err) {
    console.error("❌ ERRO AO INICIAR BOT:", err);
    process.exit(1);
  }
})();