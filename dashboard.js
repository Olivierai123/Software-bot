const express = require("express");
const session = require("express-session");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const crypto = require("crypto");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const PASSWORD = process.env.DASHBOARD_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!PASSWORD || !SESSION_SECRET) {
  throw new Error(
    "DASHBOARD_PASSWORD and SESSION_SECRET must be set in .env"
  );
}

if (PASSWORD.length < 16 || SESSION_SECRET.length < 32) {
  throw new Error(
    "Dashboard password must be at least 16 characters and SESSION_SECRET at least 32 characters."
  );
}

// Trust the HTTPS reverse proxy in production.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  name: "olivier_dashboard",
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

// Require HTTPS in production.
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === "production" &&
    !req.secure
  ) {
    return res.status(403).send("HTTPS is required.");
  }

  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: "Too many login attempts. Try again later."
});

function passwordMatches(input) {
  const supplied = Buffer.from(String(input || ""));
  const expected = Buffer.from(PASSWORD);

  return supplied.length === expected.length &&
    crypto.timingSafeEqual(supplied, expected);
}

function requireLogin(req, res, next) {
  if (req.session && req.session.authenticated) {
    return next();
  }

  res.redirect("/");
}

app.get("/", (req, res) => {
  if (req.session.authenticated) {
    return res.redirect("/dashboard");
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Olivier Bot Login</title>
    </head>
    <body>
      <h1>Olivier WhatsApp AI Bot</h1>
      <h2>Dashboard Login</h2>

      <form method="POST" action="/login">
        <label for="password">Dashboard password</label>
        <input
          id="password"
          type="password"
          name="password"
          required
          minlength="16"
          autocomplete="current-password"
        >
        <button type="submit">Log in</button>
      </form>
    </body>
    </html>
  `);
});

app.post("/login", loginLimiter, (req, res, next) => {
  if (!passwordMatches(req.body.password)) {
    return res.status(401).send(
      "Incorrect password. <a href='/'>Try again</a>."
    );
  }

  req.session.regenerate((error) => {
    if (error) return next(error);

    req.session.authenticated = true;

    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      res.redirect("/dashboard");
    });
  });
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Olivier Dashboard</title>
    </head>
    <body>
      <h1>Olivier WhatsApp AI Bot</h1>
      <h2>Dashboard</h2>
      <p>Dashboard login successful.</p>
      <p>WhatsApp connection controls will be connected next.</p>

      <form method="POST" action="/logout">
        <button type="submit">Log out</button>
      </form>
    </body>
    </html>
  `);
});

app.post("/logout", requireLogin, (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);

    res.clearCookie("olivier_dashboard");
    res.redirect("/");
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Olivier dashboard listening on port ${PORT}`);
});

module.exports = app;
