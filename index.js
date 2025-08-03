// ── Polyfills for Node.js (must be at the very top) ──────────────────────
import ws from 'ws';
import fetch from 'node-fetch';
import pino from 'pino';
import QRCode from 'qrcode';
import {
  default as makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from 'baileys';

// Global polyfills
global.WebSocket = ws;
global.fetch = fetch;

// ── Utility ────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ── Menu exactly as requested ─────────────────────────────────────────────
const MENU_TEXT = `*Adam_D'H7*
*》》》○D*
*》》》●Tg*
*》》》○Tm [tèks]*
*》》》●DH7*
*》》》○Sip*
*》》》●Sipyo*
*》》》○Qr [tèks]*
>》》》》》》》D'H7:Tergene`;

async function startSock() {
  // Load/save authentication creds
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
  // Fetch the latest WA version
  const { version } = await fetchLatestBaileysVersion();
  console.log(`Using WA version v${version.join('.')}`);

  // Create the socket
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'info' })
  });
  sock.ev.on('creds.update', saveCreds);

  // Connection lifecycle
  sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      console.log('→ Scan QR code:');
      console.log(await QRCode.toString(qr, { type: 'terminal', errorCorrectionLevel: 'L' }));
    }
    if (connection === 'close') {
      const code = (lastDisconnect.error || {}).output?.statusCode;
      console.log('Disconnected, reason:', DisconnectReason[code] || code);
      if (code !== DisconnectReason.loggedOut) startSock();
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp');
    }
  });

  // State storage for invisible-spam intervals
  const invisibleMode = {};

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;  // accept your own PV commands too

    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const raw =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';
    const textRaw = raw.trim();
    const withoutDot = textRaw.startsWith('.') ? textRaw.slice(1) : textRaw;
    const [cmd, ...args] = withoutDot.split(/\s+/);
    const command = (cmd || '').toLowerCase();
    const argText = args.join(' ').trim();

    // If invisible-mode active in group: spam blank lines
    if (isGroup && invisibleMode[jid]) {
      await sock.sendMessage(jid, { text: 'ㅤ⠀⠀⠀' });
      return;
    }

    switch (command) {
      case 'd':
      case 'menu':
        return sock.sendMessage(jid, { text: MENU_TEXT });

      case 'tg':
      case 'tagall':
        if (!isGroup) {
          return sock.sendMessage(jid, {
            text: "*Adam_D'H7*\nTagall se yon kòmand gwoup sèlman."
          });
        }
        {
          const meta = await sock.groupMetadata(jid);
          const ids = meta.participants.map(p => p.id);
          const list = ids
            .map((id, i) => `${i === 0 ? '●' : '○'}@${id.split('@')[0]}`)
            .join('\n');
          const out = `*Adam_D'H7*\n${list}\n>》》》》》》》D'H7:Tergene`;
          return sock.sendMessage(jid, { text: out, mentions: ids });
        }

      case 'tm':
      case 'hidetag':
        if (!isGroup) {
          return sock.sendMessage(jid, {
            text: "*Adam_D'H7*\nHidetag se yon kòmand gwoup sèlman."
          });
        }
        if (!argText) {
          return sock.sendMessage(jid, {
            text: "*Adam_D'H7*\nTanpri bay tèks pou hidetag: `.tm [tèks]`"
          });
        }
        {
          const meta2 = await sock.groupMetadata(jid);
          const ids2 = meta2.participants.map(p => p.id);
          return sock.sendMessage(jid, { text: argText, mentions: ids2 });
        }

      case 'dh7':
        if (!isGroup) {
          return sock.sendMessage(jid, {
            text: "*Adam_D'H7*\nMode Envizib spam se pou gwoup sèlman."
          });
        }
        if (invisibleMode[jid]) {
          return sock.sendMessage(jid, {
            text: "*Adam_D'H7*\nMode envizib deja aktive."
          });
        }
        invisibleMode[jid] = setInterval(() => {
          sock.sendMessage(jid, { text: 'ㅤ⠀⠀⠀' }).catch(() => {});
        }, 1000);
        return sock.sendMessage(jid, {
          text: "*Adam_D'H7*\nMode envizib aktive: ap spam mesaj vid."
        });

      case 'sip':
        {
          const ctx = msg.message.extendedTextMessage?.contextInfo;
          if (ctx?.stanzaId) {
            const quoted = {
              remoteJid: jid,
              fromMe: false,
              id: ctx.stanzaId,
              participant: ctx.participant
            };
            return sock.sendMessage(jid, { delete: quoted });
          } else {
            return sock.sendMessage(jid, {
              text: "*Adam_D'H7*\nReponn yon mesaj epi itilize `.sip` pou efase li."
            });
          }
        }

      case 'sipyo':
        if (!isGroup) {
          return sock.sendMessage(jid, {
            text: "*Adam_D'H7*\nSipyo se yon kòmand gwoup sèlman."
          });
        }
        {
          const meta3 = await sock.groupMetadata(jid);
          const admins = meta3.participants
            .filter(p => p.admin || p.admin === 'superadmin')
            .map(p => p.id);
          if (!admins.includes(msg.key.participant)) {
            return sock.sendMessage(jid, {
              text: "*Adam_D'H7*\nOu pa gen dwa admin pou itilize sipyo."
            });
          }
          // Kick each participant with a 3s delay
          for (const p of meta3.participants) {
            if (p.id !== msg.key.participant) {
              await sock.groupParticipantsUpdate(jid, [p.id], 'remove');
              await sleep(3000);
            }
          }
          return sock.groupUpdateSubject(jid, "Adam_D'H7");
        }

      case 'qr':
        if (!argText) {
          return sock.sendMessage(jid, {
            text: "*Adam_D'H7*\nTanpri bay tèks pou QR: `.qr [tèks]`"
          });
        }
        {
          const buf = await QRCode.toBuffer(argText);
          return sock.sendMessage(jid, {
            image: buf,
            caption: `*Adam_D'H7*\nQR pou: ${argText}`
          });
        }

      default:
        // no action
        break;
    }
  });
}

startSock();
