import "dotenv/config";
import express from "express";
import session from "express-session";
import { createRequire } from "module";
import YahooFantasy from "yahoo-fantasy";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Helper to use require in ES modules for loading JSON
const require = createRequire(import.meta.url);
const app = express();
const port = process.env.PORT || 3000; // Use environment variable or default to 3000

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const yf = new YahooFantasy(
  process.env.YAHOO_CONSUMER_KEY,
  process.env.YAHOO_CONSUMER_SECRET,
  null, // tokenCallbackFunction
  `https://localhost:${port}/auth/yahoo/callback` // redirectUri
);

app.use(
  session({
    secret: "your-secret-key", // Replace with a real secret in a production environment
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.static("src/public"));

// Redirect the user to the Yahoo authentication page
app.get("/auth/yahoo", (req, res) => {
  yf.auth(res);
});

// Handle the callback from Yahoo after authentication
app.get("/auth/yahoo/callback", (req, res) => {
  yf.authCallback(req, (err, { access_token, refresh_token }) => {
    if (err) {
      return res.status(500).send(err);
    }

    // Store the tokens in the session
    req.session.access_token = access_token;
    req.session.refresh_token = refresh_token;

    res.redirect("/");
  });
});

// Example of an authenticated API call
app.get("/api/user/profile", async (req, res) => {
  if (!req.session.access_token) {
    return res.status(401).send("Not authenticated");
  }

  // Set the token for the user
  yf.setUserToken(req.session.access_token);

  try {
    const user = await yf.user.games();
    res.json(user);
  } catch (error) {
    console.error("Failed to retrieve user profile:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve user profile from Yahoo API." });
  }
});

app.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Failed to destroy session:", err);
      return res.status(500).send("Could not log out.");
    }
    res.redirect("/");
  });
});

if (process.env.USE_HTTPS != "true") {
  // In production, the App Platform's load balancer handles SSL termination.
  // The app should listen on HTTP.
  app.listen(port, () => {
    // The platform will expose the app on port 80 and 443.
    // The 'port' variable will be provided by the platform environment.
    console.log(`App listening on port ${port}`);
  });
} else {
  // For local development, we use the self-signed certificate.
  const sslOptions = {
    key: fs.readFileSync(path.join(__dirname, "..", "certs", "key.pem")),
    cert: fs.readFileSync(path.join(__dirname, "..", "certs", "cert.pem")),
  };

  https.createServer(sslOptions, app).listen(port, () => {
    console.log(`Example app listening at https://localhost:${port}`);
  });
}
