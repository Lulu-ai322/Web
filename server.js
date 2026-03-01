require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const app = express();

app.use(express.json());
app.use(express.static("public"));

const BOT_API = process.env.BOT_API;
const API_KEY = process.env.API_KEY;

// Earn coins
app.post("/earn", async (req, res) => {
  const { userId } = req.body;

  const response = await fetch(`${BOT_API}/earn`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, apiKey: API_KEY })
  });

  const data = await response.json();
  res.json(data);
});

// Generate item
app.post("/generate", async (req, res) => {
  const { userId, item } = req.body;

  const response = await fetch(`${BOT_API}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, item, apiKey: API_KEY })
  });

  const data = await response.json();
  res.json(data);
});

app.listen(process.env.PORT, () => {
  console.log("Website running");
});
