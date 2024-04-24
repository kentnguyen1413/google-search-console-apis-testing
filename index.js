const https = require("https");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { google } = require("googleapis");

const PORT = 3002;

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUR_CLIENT_ID,
  process.env.YOUR_CLIENT_SECRET,
  process.env.YOUR_REDIRECT_URL
);

const authorizationUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: ["https://www.googleapis.com/auth/webmasters"],
  include_granted_scopes: true,
});

app.get("/", (req, res) => {
  res.redirect(authorizationUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  if (code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      res.redirect(process.env.REDIRECT_URL);
    } catch (error) {
      res.send("Error during authentication");
      // Redirect to a login error page
      // res.redirect('http://localhost:3000/login?error=authFailed');
      console.error(error);
    }
  } else res.sendStatus(404);
});

const searchconsole = google.searchconsole({
  version: "v1",
  auth: oauth2Client,
});

// Get all listed sites
app.get("/sites", async (req, res) => {
  try {
    const result = await searchconsole.sites.list({});
    res.json({ sites: result.data.siteEntry });
  } catch (error) {
    res.status(500).send("Failed to fetch sites");
    console.error(error);
  }
});

// Add a new site
app.post("/site/add", async (req, res) => {
  try {
    const { siteUrl } = req.body; // The URL of the site to add
    // This is a placeholder as adding a site might require user verification
    const result = await searchconsole.sites.add({ siteUrl });
    res.json({ success: true, data: result.data });
  } catch (error) {
    res.status(500).send("Failed to add site");
    console.error(error);
  }
});

// Delete a site
app.post("/site/delete", async (req, res) => {
  const { siteUrl } = req.body;
  try {
    await searchconsole.sites.delete({ siteUrl });
    res.json({ success: true });
  } catch (error) {
    res.status(500).send("Failed to delete site");
    console.error(error);
  }
});

// Retrieve Information of a Specific Site
app.get("/site/info", async (req, res) => {
  const { siteUrl } = req.query;
  try {
    const result = await searchconsole.sites.get({ siteUrl });
    res.json({ site: result.data });
  } catch (error) {
    res.status(500).send("Failed to retrieve site info");
    console.error(error);
  }
});

// Revoking a token
// https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
function revokeToken() {
  // Build the string for the POST request
  let postData = "token=" + userCredential.access_token;

  // Options for POST request to Google's OAuth 2.0 server to revoke a token
  let postOptions = {
    host: "oauth2.googleapis.com",
    port: "443",
    path: "/revoke",
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  // Set up the request
  const postReq = https.request(postOptions, function (res) {
    res.setEncoding("utf8");
    res.on("data", (d) => {
      console.log("Response: " + d);
    });
  });

  postReq.on("error", (error) => {
    console.log(error);
  });

  // Post the request with data
  postReq.write(postData);
  postReq.end();
}

// Refreshing an access token (offline access)
// https://developers.google.com/identity/protocols/oauth2/web-server#offline
oauth2Client.on("tokens", (tokens) => {
  if (tokens.refresh_token) {
    // store the refresh_token in your secure persistent database
    console.log(tokens.refresh_token);
  }
  console.log(tokens.access_token);
});

// To set the refresh_token at a later time, you can use the setCredentials method:
// oauth2Client.setCredentials({
//   refresh_token: `STORED_REFRESH_TOKEN`
// });

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
