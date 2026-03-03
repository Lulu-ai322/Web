require("dotenv").config();
const fs = require("fs");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const PREFIX = process.env.PREFIX || "$";
const ADMIN = process.env.ADMIN_ID;
const START = parseInt(process.env.START_COINS) || 5;
const FILE = process.env.DATA_FILE || "./data.json";

/* ================= DATABASE ================= */

if (!fs.existsSync(FILE)) {
  fs.writeFileSync(FILE, JSON.stringify({
    coins: {},
    stock: {},
    prices: {},
    redeem: {},
    active: null
  }, null, 2));
}

const load = () => JSON.parse(fs.readFileSync(FILE));
const save = (d) => fs.writeFileSync(FILE, JSON.stringify(d, null, 2));

/* ================= CLIENT ================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log("🤖 Premium Gen Bot Online");
});

/* ================= MESSAGE ================= */

client.on("messageCreate", async (msg) => {
  if (msg.author.bot || !msg.guild) return;
  if (!msg.content.startsWith(PREFIX)) return;

  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const uid = msg.author.id;
  const data = load();

  if (!data.coins[uid]) data.coins[uid] = START;

  /* ========= ACTIVE CHANNEL LOCK ========= */

  if (uid !== ADMIN && data.active && msg.channel.id !== data.active) {
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Red")
          .setTitle("❌ Wrong Channel")
          .setDescription(`Use commands in <#${data.active}> only.`)
      ]
    });
  }

  /* ================= USER COMMANDS ================= */

  // BALANCE
  if (["bal", "balance"].includes(cmd)) {
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Gold")
          .setTitle("💰 Your Balance")
          .setDescription(`🪙 Coins: **${data.coins[uid]}**`)
      ]
    });
  }

  // LEADERBOARD
  if (["lb", "leaderboard"].includes(cmd)) {
    const sorted = Object.entries(data.coins)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    let text = "";
    sorted.forEach((u, i) => {
      text += `#${i + 1} <@${u[0]}> — ${u[1]} coins\n`;
    });

    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Blue")
          .setTitle("🏆 Leaderboard")
          .setDescription(text || "No users yet.")
      ]
    });
  }

  // STOCK
  if (["stock", "st"].includes(cmd)) {
    let text = "";
    for (let item in data.stock) {
      text += `**${item}** | Stock: ${data.stock[item].length} | Price: ${data.prices[item]}\n`;
    }

    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Green")
          .setTitle("📦 Available Stock")
          .setDescription(text || "No items available.")
      ]
    });
  }

  // GENERATE
  if (["gen", "g"].includes(cmd)) {
    const item = args[0];
    if (!data.stock[item]) return msg.reply("❌ Item not found.");
    if (data.stock[item].length === 0) return msg.reply("❌ Out of stock.");
    if (data.coins[uid] < data.prices[item])
      return msg.reply("❌ Not enough coins.");

    const account = data.stock[item].shift();
    data.coins[uid] -= data.prices[item];
    save(data);

    await msg.author.send(`🎁 **${item} Account:**\n${account}`);
    return msg.reply("✅ Account sent in DM.");
  }

  // REDEEM
  if (["redeem", "rd"].includes(cmd)) {
    const code = args[0];
    if (!data.redeem[code]) return msg.reply("❌ Invalid code.");

    const amount = data.redeem[code];
    data.coins[uid] += amount;
    delete data.redeem[code];
    save(data);

    return msg.reply(`🎉 Redeemed **${amount} coins**!`);
  }

  // HELP
  if (["h", "help"].includes(cmd)) {
    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("Purple")
          .setTitle("📜 Premium Command List")
          .setDescription(`
👤 **User Commands**

\`${PREFIX}bal / balance\`  
Check your coin balance.

\`${PREFIX}lb / leaderboard\`  
View top 10 richest users.

\`${PREFIX}stock / st\`  
See all generator items, stock & price.

\`${PREFIX}gen / g <item>\`  
Generate account (sent in DM).

\`${PREFIX}redeem / rd <code>\`  
Redeem coin reward code.

━━━━━━━━━━━━━━━━━━

👑 **Admin Commands**

\`${PREFIX}cg <item> <price>\`  
Create new generator item.

\`${PREFIX}add <item> email1 email2\`  
Add stock accounts.

\`${PREFIX}active / ac\`  
Lock commands to current channel.

\`${PREFIX}cc <code> <coins>\`  
Create redeem code.

\`${PREFIX}dc <code>\`  
Delete redeem code.
`)
      ]
    });
  }

  /* ================= ADMIN COMMANDS ================= */

  if (uid !== ADMIN) return;

  // CREATE GEN
  if (cmd === "cg") {
    const item = args[0];
    const price = parseInt(args[1]);
    if (!item || !price) return msg.reply("Usage: $cg item price");

    data.stock[item] = [];
    data.prices[item] = price;
    save(data);

    return msg.reply("✅ Generator created.");
  }

  // ADD STOCK
  if (cmd === "add") {
    const item = args[0];
    if (!data.stock[item]) return msg.reply("Item not found.");

    const emails = args.filter(x => x.includes("@"));
    data.stock[item].push(...emails);
    save(data);

    return msg.reply(`✅ Added ${emails.length} accounts.`);
  }

  // ACTIVE CHANNEL
  if (["active", "ac"].includes(cmd)) {
    data.active = msg.channel.id;
    save(data);
    return msg.reply("✅ Commands locked to this channel.");
  }

  // CREATE CODE
  if (cmd === "cc") {
    const code = args[0];
    const coins = parseInt(args[1]);
    if (!code || !coins) return msg.reply("Usage: $cc code coins");

    data.redeem[code] = coins;
    save(data);
    return msg.reply("✅ Redeem code created.");
  }

  // DELETE CODE
  if (cmd === "dc") {
    const code = args[0];
    delete data.redeem[code];
    save(data);
    return msg.reply("🗑 Redeem code deleted.");
  }

});

client.login(process.env.TOKEN);
  const args = msg.content.slice(PREFIX.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  const uid = msg.author.id;
  const data = load();

  if (!data.coins[uid]) data.coins[uid] = START_COINS;

  /* BAL */
  if (["bal","balance"].includes(cmd)) {
    return msg.reply({ embeds: [
      new EmbedBuilder()
        .setTitle("💰 Balance")
        .setDescription(`Coins: **${data.coins[uid]}**`)
        .setColor("Gold")
    ]});
  }

  /* LEADERBOARD */
  if (["lb","leaderboard"].includes(cmd)) {
    const sorted = Object.entries(data.coins)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,10);

    let desc="";
    sorted.forEach((u,i)=>{
      desc += `#${i+1} <@${u[0]}> — ${u[1]} coins\n`;
    });

    return msg.reply({ embeds:[
      new EmbedBuilder()
        .setTitle("🏆 Leaderboard")
        .setDescription(desc)
        .setColor("Blue")
    ]});
  }

  /* STOCK */
  if (["stock","st"].includes(cmd)) {
    let desc="";
    for (let item in data.stock) {
      desc += `**${item}**\nStock: ${data.stock[item].length}\nPrice: ${data.prices[item]}\n\n`;
    }

    return msg.reply({ embeds:[
      new EmbedBuilder()
        .setTitle("📦 Stock List")
        .setDescription(desc || "No items.")
        .setColor("Green")
    ]});
  }

  /* GEN */
  if (["gen","g"].includes(cmd)) {
    if (data.activeChannel && msg.channel.id !== data.activeChannel)
      return msg.reply("❌ Use in active channel.");

    const item = args[0];
    if (!data.stock[item]) return msg.reply("Item not found.");
    if (data.stock[item].length === 0) return msg.reply("Out of stock.");
    if (data.coins[uid] < data.prices[item])
      return msg.reply("Not enough coins.");

    const acc = data.stock[item].shift();
    data.coins[uid] -= data.prices[item];
    save(data);

    await msg.author.send(`🎁 ${item} Account:\n${acc}`);
    return msg.reply("✅ Sent in DM.");
  }

  /* CREATE GEN */
  if (["cg","create"].includes(cmd)) {
    if (uid !== ADMIN_ID) return;
    const item = args[0];
    const price = parseInt(args[1]);
    data.stock[item]=[];
    data.prices[item]=price;
    save(data);
    return msg.reply("✅ Generator Created.");
  }

  /* ADD GEN */
  if (cmd==="add") {
    if (uid !== ADMIN_ID) return;
    const item=args[1];
    const emails = msg.content.split(/\s+/).filter(e=>e.includes("@"));
    data.stock[item].push(...emails);
    save(data);
    return msg.reply(`✅ Added ${emails.length} accounts.`);
  }

});

client.login(process.env.TOKEN);
