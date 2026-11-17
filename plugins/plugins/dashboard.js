const express = require("express");
const QRCode = require("qrcode");
const crypto = require("crypto");
const path = require("path");

const app = express();

app.use(express.json());

let botSocket = null;
let currentQR = null;
let connected = false;
let pairingCode = null;
let pairingExpires = 0;

const PASSWORD = process.env.DASHBOARD_PASSWORD;
const OWNER_NUMBER = process.env.OWNER_NUMBER;
const PORT = Number(process.env.PORT || 3000);

if (!PASSWORD || PASSWORD.length < 16) {
  throw new Error("Set a strong DASHBOARD_PASSWORD (at least 16 characters).");
}

function authenticate(req, res, next) {
  const supplied = req.headers.authorization || "";
  const expected = "Bearer " + PASSWORD;

  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);

  if (a.length !== b.length ||
      !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

app.use(express.static(path.join(__dirname, "public")));

app.use("/api", authenticate);

app.get("/api/status", (req, res) => {
  res.json({
    connected,
    hasQR: Boolean(currentQR),
    hasPairingCode: Boolean(pairingCode && Date.now() < pairingExpires)
  });
});

app.get("/api/qr", async (req, res) => {
  if (!currentQR) {
    return res.status(404).json({
      error: "No QR code available."
    });
  }

  const image = await QRCode.toDataURL(currentQR);

  res.json({ image });
});

app.post("/api/pair", async (req, res) => {
  try {
    if (!botSocket || connected) {
      return res.status(400).json({
        error: "Bot is unavailable or already connected."
      });
    }

    if (botSocket.authState.creds.registered) {
      return res.status(400).json({
        error: "This WhatsApp account is already registered."
      });
    }

    if (!OWNER_NUMBER) {
      return res.status(400).json({
        error: "OWNER_NUMBER is not configured."
      });
    }

    if (pairingCode && Date.now() < pairingExpires) {
      return res.json({
        code: pairingCode,
        expiresAt: pairingExpires
      });
    }

    const code = await botSocket.requestPairingCode(
      OWNER_NUMBER.replace(/\D/g, "")
    );

    pairingCode = code;
    pairingExpires = Date.now() + 5 * 60 * 1000;

    res.json({
      code,
      expiresAt: pairingExpires
    });

  } catch (error) {
    res.status(500).json({
      error: "Could not generate pairing code."
    });
  }
});

function startDashboard(socket) {
  botSocket = socket;
}

function updateQR(qr) {
  currentQR = qr;
}

function updateConnection(value) {
  connected = value;

  if (value) {
    currentQR = null;
    pairingCode = null;
    pairingExpires = 0;
  }
}

app.listen(PORT, "0.0.0.0", () => {
  console.log("Olivier dashboard started on port " + PORT);
});

module.exports = {
  startDashboard,
  updateQR,
  updateConnection
};
