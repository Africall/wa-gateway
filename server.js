const express = require("express");
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");
const { Server } = require("socket.io");
const qrcode = require("qrcode-terminal");
const cors = require("cors");
const http = require("http");
require("dotenv").config();

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info");
  const sock = makeWASocket({ auth: state });

  sock.ev.on("connection.update", ({ connection, qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
      io.emit("qr", qr);
    }
    if (connection === "open") {
      console.log("✅ WhatsApp Connected");
      io.emit("ready", true);
    }
    if (connection === "close") {
      console.log("❌ Connection Closed");
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages[0];
    if (!msg.key.fromMe && msg.message?.conversation) {
      console.log("Received:", msg.message.conversation);
      io.emit("new_message", {
        from: msg.key.remoteJid,
        message: msg.message.conversation
      });
    }
  });
}

start();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 WhatsApp Gateway running on port ${PORT}`);
});
