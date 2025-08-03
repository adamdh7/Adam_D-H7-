import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason
} from '@whiskeysockets/baileys'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import fetch from 'node-fetch'

// Pour les anciennes dépendances utilisant global.fetch
if (!global.fetch) global.fetch = fetch

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error?.output?.statusCode ?? 0) !== DisconnectReason.loggedOut
      console.log('🛑 Connexion fermée. Reconnexion :', shouldReconnect)
      if (shouldReconnect) startSock()
    } else if (connection === 'open') {
      console.log('✅ Connecté à WhatsApp')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return
    console.log('📨 Nouveau message reçu :', msg.key.remoteJid)
  })
}

startSock()
