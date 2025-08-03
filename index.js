import makeWASocket, { DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode-terminal';
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';

const botToken = 'TON_TOKEN_TELEGRAM_ICI'; // remplace par ton vrai token Telegram
const bot = new Telegraf(botToken);

bot.start((ctx) => ctx.reply('🤖 Bot en ligne ! Envoie-moi un message, je vais te répondre.'));
bot.on('text', async (ctx) => {
  const message = ctx.message.text;
  const res = await fetch(`https://api.chucknorris.io/jokes/random`);
  const data = await res.json();
  await ctx.reply(`Tu m'as dit : ${message}\n🤣 Blague : ${data.value}`);
});

bot.launch().then(() => console.log('✅ Bot Telegram lancé !'));

const startBaileys = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        console.log('📴 Déconnecté, reconnexion...');
        startBaileys();
      } else {
        console.log('❌ Déconnecté définitivement.');
      }
    } else if (connection === 'open') {
      console.log('✅ Connecté à WhatsApp !');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!text) return;

    await sock.sendMessage(msg.key.remoteJid, { text: `📩 Reçu : ${text}` });
  });
};

startBaileys().catch((err) => console.error('Erreur WhatsApp:', err));
