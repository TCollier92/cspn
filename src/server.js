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
const config = require("./config.json");
const app = express();
const port = process.env.PORT || 3000; // Use environment variable or default to 3000

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const yf = new YahooFantasy(
  process.env.YAHOO_CONSUMER_KEY,
  process.env.YAHOO_CONSUMER_SECRET,
  null, // tokenCallbackFunction
  `https://${process.env.APP_HOSTNAME}/auth/yahoo/callback` // redirectUri
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

app.get("/api/leagues", async (req, res) => {
  if (!req.session.access_token) {
    return res.status(401).send("Not authenticated");
  }

  // Set the token for the user
  yf.setUserToken(req.session.access_token);

  try {
    const leagueKeys = config.Leagues.map(
      (league) => `nfl.l.${league.Key}`
    );

    const leaguesData = await yf.game.leagues("nfl", leagueKeys);
    res.json(leaguesData);
  } catch (error) {
    console.error("Failed to retrieve league information:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve league information from Yahoo API." });
  }
});

app.get("/api/leagues/:league_key/free-agents", async (req, res) => {
  if (!req.session.access_token) {
    return res.status(401).send("Not authenticated");
  }

  // Set the token for the user
  yf.setUserToken(req.session.access_token);

  try {
    const leagueKey = `nfl.l.${req.params.league_key}`;
    const count = req.query.count || 50; // Default to 50, allow client to override

    // The `yf.league.players` function is for fetching stats for specific players,
    // not for querying a collection. Passing a string as the second argument makes
    // the library interpret it as player keys, leading to an incorrect API request.
    // The correct function to query players in a league with filters is `yf.player.league()`.
    const playersData = await yf.player.league(leagueKey, {
      status: "FA",
      sort: "ADP",
      count: count,
    });

    res.json(playersData.players || []);
  } catch (error) {
    console.error("Failed to retrieve free agents:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve free agents from Yahoo API." });
  }
});

app.get("/api/leagues/:league_key/draft-results", async (req, res) => {
  if (!req.session.access_token) {
    return res.status(401).send("Not authenticated");
  }

  // Set the token for the user
  yf.setUserToken(req.session.access_token);

  try {
    const leagueKey = `nfl.l.${req.params.league_key}`;
    const draftResultsData = await yf.league.draft_results(leagueKey);

    res.json(draftResultsData.draft_results || []);
  } catch (error) {
    console.error("Failed to retrieve draft results:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve draft results from Yahoo API." });
  }
});

app.get("/api/leagues/:league_key/teams", async (req, res) => {
  if (!req.session.access_token) {
    return res.status(401).send("Not authenticated");
  }

  // Set the token for the user
  yf.setUserToken(req.session.access_token);

  try {
    const leagueKey = `nfl.l.${req.params.league_key}`;
    const teamsData = await yf.league.teams(leagueKey);

    res.json(teamsData.teams || []);
  } catch (error) {
    console.error("Failed to retrieve teams:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve teams from Yahoo API." });
  }
});

app.get("/api/leagues/:league_key/teams/:team_key/roster", async (req, res) => {
  if (!req.session.access_token) {
    return res.status(401).send("Not authenticated");
  }

  // Set the token for the user
  yf.setUserToken(req.session.access_token);

  try {
    // The league_key is part of the team_key, so we only need to pass the team_key.
    const rosterData = await yf.team.roster(req.params.team_key);

    res.json(rosterData.roster || []);
  } catch (error) {
    console.error("Failed to retrieve team roster:", error);
    res
      .status(500)
      .json({ error: "Failed to retrieve team roster from Yahoo API." });
  }
});

app.get("/api/leagues/:league_key/players", (req, res) => {
  const { league_key } = req.params;
  // This is an unauthenticated call to the public Yahoo v3 API.
  const url = `https://pub-api.fantasysports.yahoo.com/fantasy/v3/players/nfl/${league_key}?projected=1&average=1&format=rawjson`;

  const apiReq = https.get(url, (apiRes) => {
    if (apiRes.statusCode !== 200) {
      console.error(`Yahoo API responded with status ${apiRes.statusCode}`);
      res
        .status(apiRes.statusCode)
        .json({ error: `Yahoo API responded with status ${apiRes.statusCode}` });
      apiRes.resume(); // Consume response data to free up memory
      return;
    }

    apiRes.setEncoding("utf8");
    let rawData = "";
    apiRes.on("data", (chunk) => {
      rawData += chunk;
    });
    apiRes.on("end", () => {
      try {
        const parsedData = JSON.parse(rawData);
        res.json(parsedData);
      } catch (e) {
        console.error(`Error parsing JSON from Yahoo API: ${e.message}`);
        res
          .status(500)
          .json({ error: "Failed to parse players data from Yahoo API." });
      }
    });
  });
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
    console.log(`Example app listening at https://${process.env.APP_HOSTNAME}`);
  });
}
