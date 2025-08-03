import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import express from 'express';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { useExpressServer } from 'telegraf/express';
import { Telegraf } from 'telegraf';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = 'TON_TOKEN_TELEGRAM_ICI'; // 🔁 Remplace par ton vrai token Telegram

// Telegram Bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
bot.start((ctx) => ctx.reply('🤖 Bot connecté avec succès !'));
bot.on('text', (ctx) => ctx.reply(`Vous avez dit : ${ctx.message.text}`));
bot.launch();

// Express App
const app = express();
app.get('/', (_, res) => res.send('✅ Bot en ligne sur Railway !'));

// Branche Telegraf à Express
useExpressServer(app, bot, {
  botPath: `/bot${TELEGRAM_BOT_TOKEN}`,
});

app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));

// WhatsApp (Baileys)
const startWhatsApp = async () => {
  const { state, saveCreds } = await useMultiFileAuthState(join(__dirname, './auth_info'));
  const { version, isLatest } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'error', stream: 'store' })),
    },
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    generateHighQualityLinkPreview: true,
    browser: ['TF-Focus', 'Safari', '3.0'],
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('🛑 Connexion fermée. Reconnexion :', shouldReconnect);
      if (shouldReconnect) startWhatsApp();
    }

    if (connection === 'open') {
      console.log('✅ Connecté à WhatsApp');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type === 'notify' && messages[0]?.message) {
      const msg = messages[0];
      const sender = msg.key.remoteJid;
      const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text;
      if (messageText) {
        console.log(`📥 Message de ${sender} : ${messageText}`);
        await sock.sendMessage(sender, { text: `🤖 Réponse automatique : ${messageText}` });
      }
    }
  });
};

startWhatsApp();
