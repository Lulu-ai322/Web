require("dotenv").config();
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

const FILE = process.env.DATA_FILE || "./data.json";

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify({
    coins: {},
    stock: {},
    prices: {},
    redeemCodes: {},
    activeChannel: null,
    lastEarn: {}
  }, null, 2));
}

const load = () => JSON.parse(fs.readFileSync(FILE));
const save = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

/* HOME ROUTE */
app.get("/", (req,res)=>{
  if (!req.session.user)
    return res.sendFile(path.join(__dirname,"public/index.html"));

  return res.sendFile(path.join(__dirname,"public/dashboard.html"));
});

/* DISCORD LOGIN */
app.get("/login",(req,res)=>{
  const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(url);
});

/* CALLBACK */
app.get("/callback", async (req,res)=>{
  try{
    const code = req.query.code;

    const token = await axios.post("https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const user = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.data.access_token}` }
    });

    req.session.user = user.data;

    const data = load();
    if (!data.coins[user.data.id])
      data.coins[user.data.id] = parseInt(process.env.START_COINS);
    save(data);

    res.redirect("/");
  } catch(err){
    console.log(err.response?.data || err);
    res.send("OAuth Error");
  }
});

/* USER INFO */
app.get("/api/user",(req,res)=>{
  if(!req.session.user)
    return res.json({ logged:false });

  const data = load();
  const uid = req.session.user.id;

  if(!data.coins[uid])
    data.coins[uid] = parseInt(process.env.START_COINS);

  save(data);

  res.json({
    logged:true,
    username:req.session.user.username,
    avatar:`https://cdn.discordapp.com/avatars/${uid}/${req.session.user.avatar}.png`,
    coins:data.coins[uid]
  });
});

/* EARN SYSTEM (2 Coins + 1 Min Cooldown) */
app.post("/api/earn",(req,res)=>{
  if(!req.session.user)
    return res.json({ success:false });

  const data = load();
  const uid = req.session.user.id;

  if(!data.lastEarn) data.lastEarn = {};

  const cooldown = 60000;
  const now = Date.now();

  if(now - (data.lastEarn[uid] || 0) < cooldown)
    return res.json({ success:false });

  data.coins[uid] += 2;
  data.lastEarn[uid] = now;

  save(data);
  res.json({ success:true });
});

/* LOGOUT */
app.get("/logout",(req,res)=>{
  req.session.destroy();
  res.redirect("/");
});

app.listen(process.env.PORT || 3000, ()=>console.log("🌐 Web Running"));
