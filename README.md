<p align="center">
  <img src="https://res.cloudinary.com/dckwrqrur/image/upload/v1756093986/tf-stream-url/Screenshot_20250328_182435_Gallery_z774ui.jpg" alt="Adam_D'H7" width="600">
  <h1 align="center">Adam_D'H7</h1>
  <p align="center">
    <img src="https://res.cloudinary.com/dckwrqrur/image/upload/v1756090421/tf-stream-url/ca4b46bf6d3b54cefd2a68765ea84299_0_kglasx.jpg" alt="Multi-devices">
    <img src="https://res.cloudinary.com/dckwrqrur/video/upload/v1756090767/tf-stream-url/VID-20250824-WA0993_a6eesn.mp4" alt="Version">
    <img src="https://res.cloudinary.com/dckwrqrur/image/upload/v1756090201/tf-stream-url/IMG-20250722-WA0021_ojuslt.jpg" alt="Licence">
  </p>
</p>

<div align="center">
  
✨ **Un bot WhatsApp** combinant puissance et divertissement  
🔥 **Modulable** • 🌍 **Communauté active**

</div>

---

## 🌟 Pourquoi choisir Adam_D'H7?

| Fonctionnalité | Description |
|---------------|-------------|
| 🎛️ **Multi-appareils** | Utilisez le même bot sur plusieurs devices simultanément |
| ⚡ **Performances** | Temps de réponse optimisé grâce à une architecture légère |
| 🧩 **Modulaire** | Activez/désactivez les modules selon vos besoins |

---

## 🚀 Déploiement
---

### 2. Hébergement Panel

#### a. Méthode rapide (recommandée)

1. Créez un fichier `index.js`.
2. Collez à l'intérieur du fichier le script suivant et veillez à remplir les variables selon vos besoins.
3. Démarrez votre panel.

<details>
<summary>Cliquez pour voir le script</summary>

```js

const fs = require("fs");
const { spawnSync, spawn } = require("child_process");

const zokouEnv = {
  // Identifiant de session WhatsApp (utilisé pour se connecter à votre compte)
  SESSION_ID: "",

  // Préfixe de commande utilisé pour déclencher le bot
  PREFIX: ".",

  // Si défini sur "oui", le bot verra automatiquement tous les statuts WhatsApp
  AUTO_READ_STATUS: "non",

  // Si défini sur "oui", le bot téléchargera automatiquement tous les statuts WhatsApp
  AUTO_DOWNLOAD_STATUS: "non",

  // Le nom affiché de votre bot
  BOT_NAME: "Zokou-MD",

  // Le thème visuel pour les menus du bot (nom prédéfini ou liens médias)
  MENU_THEME: "LUFFY",

  // Si "non", les commandes ne fonctionneront pas en privé pour les autres
  PM_PERMIT: "non",

  // Si "oui", le bot est disponible pour tout le monde ; si "non", seul le propriétaire peut l'utiliser
  MODE_PUBLIC: "oui",

  // Contrôle l'activité visible du bot : 1 = en ligne, 2 = saisie, 3 = enregistrement, vide = réel
  PRESENCE: "1",

  // Votre nom affiché (nom du propriétaire)
  OWNER_NAME: "Djalega++",

  // Votre numéro de téléphone au format international
  OWNER_NUMBER: "228 XX XX XX XX",

  // Nombre d'avertissements avant qu'un utilisateur ne soit sanctionné
  WARN_COUNT: 3,

  // Si "oui", le bot envoie un message de bienvenue au démarrage
  STARTING_BOT_MESSAGE: "oui",

  // Si "oui", le bot répond automatiquement aux messages privés
  PM_CHATBOT: "non",

  // Si "oui", ajoute un délai entre les commandes pour éviter le spam
  ANTI_COMMAND_SPAM: "non",

  // Si "oui", les messages supprimés par d'autres vous seront envoyés en privé
  ANTI_DELETE_MESSAGE: "non",

  // Si "oui", le bot réagit automatiquement aux messages entrants
  AUTO_REACT_MESSAGE: "non",

  // Si "oui", le bot réagit automatiquement aux statuts
  AUTO_REACT_STATUS: "non",

  // Fuseau horaire utilisé par le bot
  TIME_ZONE: "Africa/Sao_Tome",

  // Environnement serveur utilisé (ex : HEROKU, VPS, etc.)
  SERVER: "vps",

  // Nom du pack de stickers utilisé par le bot
  STICKER_PACKNAME: "made with ❤; Zokou-MD",
};

//////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////

function cloneRepository() {
  const cloneResult = spawnSync("git", [
    "clone",
    "https://github.com/luffy8979/Zokou-MD-French",
    "zokou",
  ]);

  if (cloneResult.error) {
    console.error("Error cloning repository:", cloneResult.error);
  }

  const envFile = "zokou/set.env";

  if (!fs.existsSync(envFile)) {
    for (const [key, value] of Object.entries(zokouEnv)) {
      value ? fs.appendFileSync(envFile, `${key}=${value}\n`) : null;
    }
  }

  installDependancies();
}

function installDependancies() {
  const result = spawnSync("npm", ["install"], {
    cwd: "zokou",
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  });

  if (result.error || result.status !== 0) {
    console.error("Error installing dependencies:", result.error);
    process.exit(1);
  }
}

function checkDependencies() {
  const result = spawnSync("npm", ["ls"], {
    cwd: "zokou",
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.log("Some dependencies are missing or invalid.");
    installDependancies();
  } else {
    console.log("All dependencies are installed properly.");
  }
}

function startPm2() {
  const pm2 = spawn(
    "npx",
    ["pm2", "start", "index.js", "--name", "zokou", "--attach"],
    {
      cwd: "zokou",
      stdio: "inherit",
    }
  );

  pm2.on("exit", (code) => {
    if (code !== 0) console.error(`PM2 exited with code ${code}`);
  });

  pm2.on("error", (err) => {
    console.error("PM2 encountered an error:", err);
  });

  pm2?.stderr?.on("data", (data) => {
    console.log(data.toString());
  });

  pm2?.stdout?.on("data", (data) => {
    console.log(data.toString());
  });
}

if (!fs.existsSync("zokou")) {
  cloneRepository();
}

checkDependencies();
startPm2();

```

</details>

#### b. Méthode manuelle
Pour une installation classique sur un panel ou un VPS :

[![Download ZIP](https://img.shields.io/badge/Download-ZIP-blue?style=for-the-badge&logo=github)](https://github.com/luffy8979/Zokou-MD-French/archive/refs/heads/main.zip)

### 3. Hébergement VPS

```bash
git clone https://github.com/luffy8979/Zokou-MD-French # (ou utilisez le ZIP)
cd Zokou-MD-French
npm install
npm start
```

1. Configurez le fichier `.env` selon vos besoins (voir exemple plus bas).

---

## 🧰 Essentials

### 🔑 Accès Rapide

| Service | Lien | Statut |
|---------|------|--------|
| **Session Scan** | [https://zokou-scan.onrender.com](https://zokou-scan.onrender.com) | ![Online](https://img.shields.io/badge/Status-Online-green) |
| **Session Scan 2** | [zokouscan-din3.onrender.com](https://zokouscan-din3.onrender.com) | ![Online](https://img.shields.io/badge/Status-Online-green) |
| **Backup Server** | [zokou-web.onrender.com](https://zokou-web.onrender.com/) | ![Online](https://img.shields.io/badge/Status-Online-green) |

### ⚙️ Configuration Minimaliste

```env
# Fichier .env
SESSION_ID="votre_session_ici"  # Obligatoire
PREFIX="!"                      # Caractère de commande
OWNER_NUMBER="22891733300"       # Votre numéro WhatsApp
```

## 💜 Remerciements

### 🏆 Contributeurs Clés

| Membre | Contribution | Lien |
|--------|--------------|------|
| **Fatao** | Commandes GPT/DALL-E • Modules APK | [GitHub](https://github.com/fatao) |
| **CrazyPrince** | Hébergement d'un service de session | site fermer |

### 🌟 Soutiens Spéciaux

- **La communauté Zokou** pour les tests et feedbacks  
- **Contributors** sur GitHub ([Voir tous](https://github.com/luffy8979/Zokou-MD-French/graphs/contributors))  
- **Beta Testers** pour leur patience sur les versions instables 😅

### 📚 Bibliothèques Utilisées

```bash
@WhiskeySocket/baileys
```
