const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { csrfSync } = require("csrf-sync");
const crypto = require("crypto");
const fs = require("fs");

require("dotenv").config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const PASSWORD = process.env.DASHBOARD_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!PASSWORD || !SESSION_SECRET) {
  throw new Error("Missing dashboard environment settings.");
}

if (PASSWORD.length < 16 || SESSION_SECRET.length < 32) {
  throw new Error("Password must be 16+ characters and session secret 32+ characters.");
}

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

fs.mkdirSync("./data", { recursive: true });

app.use(helmet());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  name: "olivier_dashboard",
  store: new SQLiteStore({
    db: "dashboard-sessions.db",
    dir: "./data"
  }),
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 60 * 1000
  }
}));

app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && !req.secure) {
    return res.status(403).send("HTTPS is required.");
  }
  next();
});

const {
  csrfSynchronisedProtection
} = csrfSync({
  getTokenFromRequest: req => req.body.CSRFToken
});

app.use(csrfSynchronisedProtection);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

function passwordMatches(input) {
  const supplied = Buffer.from(String(input || ""));
  const expected = Buffer.from(PASSWORD);

  return supplied.length === expected.length &&
    crypto.timingSafeEqual(supplied, expected);
}

function requireLogin(req, res, next) {
  if (req.session.authenticated) return next();
  res.redirect("/");
}

app.get("/", (req, res) => {
  if (req.session.authenticated) {
    return res.redirect("/dashboard");
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Olivier Bot Login</title>
    </head>
    <body>
      <h1>Olivier WhatsApp AI Bot</h1>
      <h2>Dashboard Login</h2>

      <form method="POST" action="/login">
        <input type="hidden" name="CSRFToken"
          value="${req.csrfToken()}">

        <input
          type="password"
          name="password"
          placeholder="Dashboard password"
          minlength="16"
          required
        >

        <button type="submit">Login</button>
      </form>
    </body>
    </html>
  `);
});

app.post("/login", loginLimiter, (req, res, next) => {
  if (!passwordMatches(req.body.password)) {
    return res.status(401).send("Incorrect password. <a href='/'>Try again</a>.");
  }

  req.session.regenerate(error => {
    if (error) return next(error);

    req.session.authenticated = true;

    req.session.save(saveError => {
      if (saveError) return next(saveError);
      res.redirect("/dashboard");
    });
  });
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Olivier Dashboard</title>
    </head>
    <body>
      <h1>Olivier WhatsApp AI Bot</h1>
      <h2>Dashboard</h2>
      <p>Dashboard login successful.</p>
      <p>WhatsApp controls will be connected after testing.</p>

      <form method="POST" action="/logout">
        <input type="hidden" name="CSRFToken"
          value="${req.csrfToken()}">
        <button type="submit">Logout</button>
      </form>
    </body>
    </html>
  `);
});

app.post("/logout", requireLogin, (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);
    res.clearCookie("olivier_dashboard");
    res.redirect("/");
  });
});

app.use((error, req, res, next) => {
  if (error.code === "EBADCSRFTOKEN") {
    return res.status(403).send("Invalid security token. Refresh the page.");
  }

  console.error("Dashboard error:", error);
  res.status(500).send("Dashboard error.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Olivier dashboard listening on port ${PORT}`);
});
