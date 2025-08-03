
import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import * as qrcode from 'qrcode-terminal'
import * as fs from 'fs'

// Fonction principale
async function startSock() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info')

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('❌ Déconnecté définitivement. Supprimez ./auth_info pour re-générer un QR code.')
      } else {
        console.log('🔁 Reconnexion...')
        startSock()
      }
    } else if (connection === 'open') {
      console.log('✅ Connecté à WhatsApp Web.')
    }
  })

  sock.ev.on('messages.upsert', ({ messages }) => {
    const msg = messages[0]
    if (!msg.key.fromMe && msg.message) {
      console.log('📩 Message reçu:', msg.message)
    }
  })
}

startSock()
