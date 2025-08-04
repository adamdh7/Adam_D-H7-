import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import Pino from 'pino'
import qrcode from 'qrcode-terminal'
import { join } from 'path'

const logger = Pino({ level: 'silent' })
const store = makeInMemoryStore({ logger })

const startSock = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    msgRetryCounterMap: {},
    generateHighQualityLinkPreview: true,
    getMessage: async () => ({ conversation: 'Hi' })
  })

  store.bind(sock.ev)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrcode.generate(qr, { small: true })
      console.log("📱 Scanne QR code nan pou konekte WhatsApp bot la.")
    }

    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (reason === DisconnectReason.loggedOut) {
        console.log('❌ Logout. Reconnect...')
        startSock()
      } else {
        console.log('🔁 Connection closed. Reconnecting...')
        startSock()
      }
    } else if (connection === 'open') {
      console.log('✅ Bot WhatsApp konekte ak siksè !')
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ''

    if (text.toLowerCase() === 'bonjour') {
      await sock.sendMessage(from, { text: '👋 Bonjou, kijan ou ye?' })
    }

    if (text.toLowerCase() === '.menu') {
      await sock.sendMessage(from, { text: '📜 Men meni bot la:\n.bonjour\n.menu' })
    }
  })
}

startSock()
