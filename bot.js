require("dotenv").config();
const fs = require("fs");
const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

const PREFIX = process.env.PREFIX;
const ADMIN_ID = process.env.ADMIN_ID;
const START_COINS = parseInt(process.env.START_COINS);
const FILE = process.env.DATA_FILE;

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

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => console.log("🤖 Bot Online"));

client.on("messageCreate", async (msg) => {
  if (!msg.guild || msg.author.bot) return;
  if (!msg.content.startsWith(PREFIX)) return;

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
