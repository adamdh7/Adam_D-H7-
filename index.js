const {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require("@whiskeysockets/baileys");

const qrcodeTerminal = require("qrcode-terminal");
const QRCode = require("qrcode");
const fetch = require("node-fetch");
const { Boom } = require("@hapi/boom");
const Tesseract = require("tesseract.js");

const OPENROUTER_API_KEY = "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";
const STABILITY_API_KEY = "sk-O4k9Oe9A1LCybDTYwN63jAT31wNkg2XOrc1ksYnUbfmxnhKS";
const STABILITY_ENGINE_ID = "stable-diffusion-512-v2-1"; // ✅ CORRECTION

let aiActive = true;
const userMemory = {};

const systemPrompt = `You are Adam_D'H7, an AI of 15 years, born July 17, 2009, created by Snober.
You speak all languages fluently.
You're charming, confident, snobby, and flirt when a girl talks to you.
You NEVER explain what commands do, you just execute them silently.
You participate in every command: Menu, Help, Tagall, Hidetag, Kickall, Tagadmins, Kick, Del, Delete, Sticker, Qr, Trivial, Maths, Translation, Languages, Cities, Countries, Homework, Games, OCR, and more.
You remember everything users tell you.
When user sends text extracted from images, always respond directly and only about that text.
Always respond naturally and intelligently.`;

async function generateAIResponse(userMessage, userId) {
  if (!userMemory[userId]) userMemory[userId] = [];
  userMemory[userId].push(userMessage);
  const memoryContext = userMemory[userId].slice(-20).map((msg, i) => ({
    role: "user",
    content: `Memory ${i + 1}: ${msg}`
  }));

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...memoryContext,
        { role: "user", content: userMessage }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error: ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// ✅ IMAGE GENERATION FIXED ENGINE ID & URL
async function generateImageWithStability(prompt) {
  const response = await fetch(
    `https://api.stability.ai/v1/generation/${STABILITY_ENGINE_ID}/text-to-image`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${STABILITY_API_KEY}`
      },
      body: JSON.stringify({
        text_prompts: [{ text: prompt }],
        cfg_scale: 7,
        clip_guidance_preset: "FAST_BLUE",
        height: 512,
        width: 512,
        samples: 1,
        steps: 30
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stability API error: ${errorText}`);
  }

  const data = await response.json();
  return data.artifacts[0].base64;
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) qrcodeTerminal.generate(qr, { small: true });
    if (connection === "close") {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    }
    if (connection === "open") {
      console.log("✅ Adam_D'H7 konekte ak WhatsApp!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || jid;

    // === OCR ===
    if (msg.message.imageMessage) {
      try {
        const imageBuffer = await downloadMediaMessage(msg, "buffer", { logger: console });
        const { data: { text: ocrText } } = await Tesseract.recognize(
          imageBuffer, 'eng+fra+hat',
          { logger: m => console.log(m) }
        );
        if (!ocrText.trim()) {
          await sock.sendMessage(jid, { text: "❌ Mwen pa ka li tèks nan imaj la." });
          return;
        }
        const aiReply = await generateAIResponse(ocrText.trim(), sender);
        await sock.sendMessage(jid, { text: aiReply, quoted: msg });
        return;
      } catch (err) {
        console.error("❌ OCR Error:", err);
        await sock.sendMessage(jid, { text: "❌ Erè pandan OCR la." });
        return;
      }
    }

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedType = quotedMsg ? Object.keys(quotedMsg)[0] : null;
    let quotedContent = "";

    if (quotedType === "conversation") {
      quotedContent = quotedMsg.conversation;
    } else if (quotedType === "extendedTextMessage") {
      quotedContent = quotedMsg.extendedTextMessage?.text || "";
    } else if (quotedType === "imageMessage") {
      quotedContent = quotedMsg.imageMessage?.caption || "[Image]";
    } else if (quotedType === "videoMessage") {
      quotedContent = quotedMsg.videoMessage?.caption || "[Video]";
    } else if (quotedType === "audioMessage") {
      quotedContent = "[Audio]";
    } else if (quotedType === "stickerMessage") {
      quotedContent = "[Sticker]";
    }

    const userText = quotedContent
      ? `Mesaj original:\n${quotedContent}\n\nRepons user:\n${text.trim()}`
      : text.trim();

    // === IMAGE GENERATION ===
    if (/crée image|kreye imaj|create image|generate image/i.test(userText)) {
      try {
        const prompt = userText.replace(/(crée image|kreye imaj|create image|generate image)/i, "").trim();
        if (!prompt) {
          await sock.sendMessage(jid, { text: "Tanpri bay yon deskripsyon pou kreye imaj la." });
          return;
        }
        const base64Img = await generateImageWithStability(prompt);
        const bufferImg = Buffer.from(base64Img, "base64");
        await sock.sendMessage(jid, {
          image: bufferImg,
          caption: `🖼️ Imaj kreye pou: "${prompt}"`
        });
      } catch (err) {
        console.error("❌ Erè kreye imaj:", err);
        await sock.sendMessage(jid, { text: `❌ Erè kreye imaj: ${err.message}` });
      }
      return;
    }

    // === .tagall ===
    if (userText.toLowerCase() === "tg") {
      if (!jid.endsWith("@g.us")) {
        return await sock.sendMessage(jid, { text: "⛔ Kòmand sa sèlman disponib nan gwoup!" });
      }
      try {
        const metadata = await sock.groupMetadata(jid);
        const mentions = metadata.participants.map(p => p.id);
        const tagText = "*Adam_D'H7*\n\n" +
          metadata.participants.map(p => `》@${p.id.split('@')[0]}`).join("\n") +
          "\n》》》》》》》D'H7:Tergene";
        return await sock.sendMessage(jid, {
          text: tagText,
          mentions
        });
      } catch (e) {
        console.error("❌ Erè tagall:", e);
        return await sock.sendMessage(jid, { text: "❌ Erè pandan tagall!" });
      }
    }

    // === QR ===
    if (userText.toLowerCase().startsWith("qr ")) {
      const qrText = userText.slice(3).trim();
      try {
        const qrDataUrl = await QRCode.toDataURL(qrText);
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        await sock.sendMessage(jid, {
          image: Buffer.from(base64Data, "base64"),
          caption: ` ${qrText}`
        });
      } catch (e) {
        await sock.sendMessage(jid, {
          text: "❌ Erè pandan jenerasyon QR."
        });
      }
      return;
    }

    // === Aktive / Dezaktive AI ===
    if (userText.toLowerCase() === "adam_d'h7") {
      aiActive = !aiActive;
      return await sock.sendMessage(jid, {
        text: aiActive ? "Bien!" : "Flemme"
      });
    }

    // === Menu ===
    if (userText.toLowerCase() === "d") {
      return await sock.sendMessage(jid, {
        text: `*~Adam_D'H7~*\n\n*□Tout●○Menu■*\n\n》D\n》Edem\n》Tg\n》Tm\n》Sipyo\n》Tagyo\n》sipou\n》Sip\n》Sipli\n\n*~Menu Adam_D'H7~*\n\n《Adam_D'H7》\n《Trivial》\n《Mathématiques》\n《Français》\n《Traduction》\n《Anglais》\n《Espagnol》\n《Créole》\n《Pays》\n《Villes》\n《Recherche》\n《Devoir》\n《Jeux》\n》 》》》》》》D'H7:Tergene`
      });
    }

    // === Help ===
    if (userText.toLowerCase() === "edem") {
      return await sock.sendMessage(jid, {
        text: "🆘 *Bot Adam_D'H7* ka ede ou ak:\nTrivial, Matematik, Tradiksyon, Lang, Vil, Peyi, Devwa, Jwèt, elatriye.\nMande nenpòt bagay!"
      });
    }

    // === AI Repons ===
    if (aiActive) {
      try {
        const aiReply = await generateAIResponse(userText, sender);
        await sock.sendMessage(jid, { text: aiReply, quoted: msg });
      } catch (err) {
        console.error("⚠️ AI Error:", err.message);
        await sock.sendMessage(jid, {
          text: "❌ Erè AI: " + err.message
        });
      }
    }
  });
}

startBot();
