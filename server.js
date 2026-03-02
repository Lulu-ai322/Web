require("dotenv").config();
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.static("public"));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

const FILE = process.env.DATA_FILE;
const load = () => JSON.parse(fs.readFileSync(FILE));
const save = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

app.get("/login",(req,res)=>{
  const url=`https://discord.com/api/oauth2/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(url);
});

app.get("/callback", async (req,res)=>{
  const code=req.query.code;

  const token=await axios.post("https://discord.com/api/oauth2/token",
    new URLSearchParams({
      client_id:process.env.CLIENT_ID,
      client_secret:process.env.CLIENT_SECRET,
      grant_type:"authorization_code",
      code,
      redirect_uri:process.env.REDIRECT_URI
    }),
    { headers:{'Content-Type':'application/x-www-form-urlencoded'} }
  );

  const user=await axios.get("https://discord.com/api/users/@me",
    { headers:{Authorization:`Bearer ${token.data.access_token}`} }
  );

  req.session.user=user.data;
  res.redirect("/dashboard.html");
});

app.post("/api/earn",(req,res)=>{
  if(!req.session.user) return res.status(401).json({error:"Login required"});

  const data=load();
  const uid=req.session.user.id;

  if(!data.coins[uid]) data.coins[uid]=parseInt(process.env.START_COINS);

  data.coins[uid]+=2;
  save(data);

  res.json({success:true});
});

app.listen(process.env.PORT,()=>console.log("🌐 Web Running"));
