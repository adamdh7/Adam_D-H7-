import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import pino from 'pino'
import qrcode from 'qrcode-terminal'
import fetch from 'node-fetch' // ✅ ESM-compatible

global.fetch = fetch // facultatif, si tu utilises fetch plus loin

async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

  const sock = makeWASocket({
    printQRInTerminal: true,
    logger: pino({ level: 'silent' }),
    auth: state
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('❌ Déconnecté. Reconnexion :', shouldReconnect)
      if (shouldReconnect) startSock()
    } else if (connection === 'open') {
      console.log('✅ Connecté à WhatsApp')
    }
  })

  sock.ev.on('messages.upsert', async (msg) => {
    console.log('📩 Nouveau message :', JSON.stringify(msg, null, 2))
  })
}

startSock()
