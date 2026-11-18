require("dotenv").config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const OpenAI = require("openai");

require("./dashboard");

const BOT_NAME = "Olivier WhatsApp AI Bot";
const OWNER = process.env.OWNER_NUMBER || "";
const PREFIX = "!";
const AUTH_FOLDER = "./session-new";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

const openai = OPENAI_API_KEY.startsWith("sk-")
  ? new OpenAI({ apiKey: OPENAI_API_KEY })
  : null;

const startTime = Date.now();

let reconnectTimer = null;
let pairingRequested = false;
let starting = false;

function cleanNumber(number) {
  return String(number || "").replace(/\D/g, "");
}

function getNumber(jid) {
  return cleanNumber(
    (jid || "").split("@")[0].split(":")[0]
  );
}

function isOwner(jid) {
  return cleanNumber(OWNER) !== "" &&
    getNumber(jid) === cleanNumber(OWNER);
}

function getText(message) {
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    ""
  );
}

function uptime() {
  const seconds = Math.floor(
    (Date.now() - startTime) / 1000
  );

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

// =================================
// START BOT
// =================================

async function startBot() {
  if (starting) return;
  starting = true;

  try {
    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
      auth: state,
      logger: pino({ level: "silent" }),
      browser: [BOT_NAME, "Chrome", "1.0.0"],
      markOnlineOnConnect: false,
      syncFullHistory: false
    });

    starting = false;

    sock.ev.on("creds.update", saveCreds);

    // =================================
    // CONNECTION HANDLING
    // =================================

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Pairing code request
      if (
        (connection === "connecting" || qr) &&
        !state.creds.registered &&
        !pairingRequested
      ) {
        pairingRequested = true;

        try {
          const phone = cleanNumber(OWNER);

          if (!phone) {
            throw new Error(
              "OWNER_NUMBER is missing from .env."
            );
          }

          console.log("Preparing WhatsApp pairing code...");

          const code = await sock.requestPairingCode(phone);

          console.log("");
          console.log("================================");
          console.log(" OLIVIER WHATSAPP AI BOT");
          console.log(` PAIRING CODE: ${code}`);
          console.log("================================");
          console.log("");
          console.log("Open WhatsApp > Linked Devices.");
          console.log("Choose Link with phone number instead.");
          console.log("Enter the displayed code.");
          console.log("Keep this code private.");
        } catch (error) {
          pairingRequested = false;

          console.error(
            "Pairing error:",
            error.message
          );
        }
      }

      // Connected
      if (connection === "open") {
        console.log("");
        console.log(`${BOT_NAME} connected successfully!`);
        console.log("");

        pairingRequested = false;

        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      }

      // Disconnected
      if (connection === "close") {
        const status =
          lastDisconnect?.error?.output?.statusCode;

        console.error("Connection closed.");
        console.error("Disconnect status:", status);
        console.error(
          "Disconnect details:",
          lastDisconnect?.error?.message || "No details"
        );

        if (status === DisconnectReason.loggedOut) {
          console.log(
            "WhatsApp rejected the saved authentication."
          );
          console.log(
            "A fresh pairing attempt is required."
          );
          return;
        }

        if (!reconnectTimer) {
          console.log("Reconnecting...");

          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            pairingRequested = false;

            startBot().catch(error => {
              starting = false;
              console.error("Reconnect error:", error);
            });
          }, 5000);
        }
      }
    });

    // =================================
    // MESSAGE HANDLER
    // =================================

    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        try {
          if (!msg.message || msg.key.fromMe) continue;

          const jid = msg.key.remoteJid;

          if (!jid || jid === "status@broadcast") continue;

          const sender = msg.key.participant || jid;
          const owner = isOwner(sender);
          const group = jid.endsWith("@g.us");

          const text = getText(msg.message).trim();

          if (!text.startsWith(PREFIX)) continue;

          const parts = text
            .slice(PREFIX.length)
            .trim()
            .split(/\s+/);

          const command = (parts.shift() || "").toLowerCase();
          const body = parts.join(" ");

          const reply = async message => {
            await sock.sendMessage(
              jid,
              { text: message },
              { quoted: msg }
            );
          };

          // MENU
          if (command === "menu" || command === "help") {
            await reply(
              `👑 *${BOT_NAME}*\n\n` +
              `GENERAL COMMANDS\n` +
              `!menu\n!ping\n!runtime\n!owner\n!ai [question]\n\n` +
              `GROUP COMMANDS\n` +
              `!tagall\n!gcstatus\n!kick @user\n!promote @user\n!demote @user\n\n` +
              `Created by Olivier`
            );
          }

          // PING
          else if (command === "ping") {
            await reply("Pong! Olivier Bot is online.");
          }

          // RUNTIME
          else if (command === "runtime") {
            await reply(`Bot uptime: ${uptime()}`);
          }

          // OWNER
          else if (command === "owner") {
            await reply("This bot is managed by its owner.");
          }

          // AI
          else if (command === "ai" || command === "ask") {
            if (!openai) {
              await reply(
                "The owner needs to configure the OpenAI API key."
              );
              continue;
            }

            if (!body) {
              await reply("Example: !ai Tell me a joke");
              continue;
            }

            await reply("Olivier AI is thinking...");

            const result = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content:
                    "You are Olivier, a friendly and helpful WhatsApp AI assistant."
                },
                {
                  role: "user",
                  content: body
                }
              ]
            });

            await reply(
              result.choices[0]?.message?.content ||
              "Sorry, I couldn't generate an answer."
            );
          }

          // GROUP COMMANDS
          else if (
            [
              "tagall",
              "gcstatus",
              "kick",
              "promote",
              "demote"
            ].includes(command)
          ) {
            if (!group) {
              await reply("This command only works in groups.");
              continue;
            }

            const metadata = await sock.groupMetadata(jid);

            const senderParticipant = metadata.participants.find(
              p => getNumber(p.id) === getNumber(sender)
            );

            const userAdmin =
              senderParticipant?.admin === "admin" ||
              senderParticipant?.admin === "superadmin";

            const botParticipant = metadata.participants.find(
              p => getNumber(p.id) === getNumber(sock.user.id)
            );

            const botAdmin =
              botParticipant?.admin === "admin" ||
              botParticipant?.admin === "superadmin";

            if (command === "gcstatus") {
              await reply(
                `GROUP INFORMATION\n\n` +
                `Name: ${metadata.subject}\n` +
                `Members: ${metadata.participants.length}\n` +
                `Description: ${metadata.desc || "No description"}`
              );
              continue;
            }

            if (command === "tagall") {
              if (!owner && !userAdmin) {
                await reply(
                  "Only group admins or the bot owner can use this command."
                );
                continue;
              }

              const mentions = metadata.participants.map(p => p.id);

              await sock.sendMessage(jid, {
                text:
                  "OLIVIER GROUP ANNOUNCEMENT\n\n" +
                  mentions.map(id => `@${getNumber(id)}`).join(" "),
                mentions
              });

              continue;
            }

            if (!owner && !userAdmin) {
              await reply(
                "Only group admins or the bot owner can use this command."
              );
              continue;
            }

            if (!botAdmin) {
              await reply(
                "Please make Olivier Bot a group admin first."
              );
              continue;
            }

            const mentioned =
              msg.message.extendedTextMessage
                ?.contextInfo?.mentionedJid || [];

            if (!mentioned.length) {
              await reply(
                `Mention a member. Example: !${command} @user`
              );
              continue;
            }

            if (command === "kick") {
              await sock.groupParticipantsUpdate(
                jid,
                mentioned,
                "remove"
              );
              await reply("Member removal requested.");
            }

            else if (command === "promote") {
              await sock.groupParticipantsUpdate(
                jid,
                mentioned,
                "promote"
              );
              await reply("Member promotion requested.");
            }

            else if (command === "demote") {
              await sock.groupParticipantsUpdate(
                jid,
                mentioned,
                "demote"
              );
              await reply("Member demotion requested.");
            }
          }

        } catch (error) {
          console.error("Message error:", error.message);
        }
      }
    });

  } catch (error) {
    starting = false;
    console.error("Bot startup error:", error);
  }
}

startBot();
