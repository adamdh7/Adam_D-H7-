import makeWASocket from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { default as qrcodeTerminal } from 'qrcode-terminal'

async function startSock() {
  const sock = makeWASocket({
    printQRInTerminal: false
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update
    if (qr) {
      qrcodeTerminal.generate(qr, { small: true })
      console.log('QR code généré, scanne-le avec WhatsApp.')
    }
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== Boom.statusCodes.loggedOut
      console.log('Connexion fermée, reconnecte ? ', shouldReconnect)
      if (shouldReconnect) {
        startSock()
      } else {
        console.log('Déconnecté définitivement')
      }
    } else if (connection === 'open') {
      console.log('Connecté avec succès ✅')
    }
  })

  sock.ev.on('messages.upsert', ({ messages }) => {
    console.log('Nouveaux messages reçus:', messages)
  })
}

startSock()
