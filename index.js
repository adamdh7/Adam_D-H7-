import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  makeInMemoryStore,
  fetchLatestBaileysVersion,
  jidNormalizedUser,
} from '@whiskeysockets/baileys';
import Pino from 'pino';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import fetch from 'node-fetch'; // node-fetch v3 compatible (ESM)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');

// Store logs
const store = makeInMemoryStore({ logger: Pino().child({ level: 'silent', stream: 'store' }) });

const start = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version, isLatest } = await fetchLatestBaileysVersion();

  console.log(`💡 Baileys version: ${version.join('.')}, latest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    auth: state,
    logger: Pino({ level: 'silent' }),
    browser: ['TF-Big deal', 'Safari', '1.0.0'],
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => ({
      conversation: '📥 Message non trouvé',
    }),
  });

  store.bind(sock.ev);

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log('🔌 Déconnexion - Raison:', reason);
      if (reason === DisconnectReason.loggedOut) {
        console.log('🔒 Déconnecté. Veuillez scanner à nouveau le QR code.');
        start(); // relance
      }
    }

    if (connection === 'open') {
      console.log('✅ Connecté avec succès à WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = jidNormalizedUser(msg.key.remoteJid);
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    console.log(`📩 Message de ${sender}: ${body}`);

    if (body === '.ping') {
      await sock.sendMessage(sender, { text: '🏓 Pong!' });
    }

    if (body === '.menu') {
      await sock.sendMessage(sender, {
        text: '📋 *Menu TF-Bot*\n\n• .ping\n• .menu\n• .qr\n• .spam\n• .bug\n• .code\n• .papa',
      });
    }
  });
};

start();
