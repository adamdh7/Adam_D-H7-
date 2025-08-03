import { makeWASocket, DisconnectReason } from '@whiskeysockets/baileys'
import * as qrcode from 'qrcode-terminal'

async function startSock() {
  const sock = makeWASocket({
    printQRInTerminal: false
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update

    if (qr) {
      console.log('QR code reçu, génère et affiche dans le terminal :')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      if (statusCode === DisconnectReason.loggedOut) {
        console.log('Déconnecté car déconnexion de WhatsApp (401), veuillez reconnecter manuellement.')
      } else {
        console.log('Connexion fermée, tentative de reconnexion...')
        startSock()
      }
    } else if (connection === 'open') {
      console.log('Connecté avec succès ✅')
    }
  })

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    console.log('Nouveaux messages reçus:', messages)
    // Tu peux ajouter ici la gestion des messages
  })
}

startSock()
