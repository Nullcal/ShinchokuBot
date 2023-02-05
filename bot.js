// トークン取得
const { clientId, guildId, token } = require("./config.json");
const { REST } = require("@discordjs/rest");

// 絵文字分割用のライブラリ
const runes = require("runes");

// 削除キー等保存用ライブラリ
const Database = require("somewhere");
const db = new Database("./database.json");

// Discord.js API呼び出し？
const rest = new REST({ version: "10" }).setToken(token);

// データベースから削除キー取得
function getDeleteKey() {
  return db.find("deleteKey")[0].emo; //"<:arrow_circuit:1049529634510864445>";
}

// データベース初期化
function resetPreferences() {
  db.save("deleteKey", {emo: "<:arrow_circuit:1049529634510864445>"});
}

// Discord.js モジュールのインポート
const Discord = require("discord.js");
const BotId = "1049173634142449714";

// Discord Client のインスタンス作成
const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js')
const client = new Client({
  "intents": [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ],
  "partials": [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});


// 絵文字を分割
function splitEmoji(emo) {
  return emo.split(/[\s><]+/g)
    .map(e => runes(e))
    .map(e => /^\:/.test(e) ? e.join("") : e)
    .reduce((a, v) => a.concat(v), [])
    .map(e => e[0] == ":" ? {
        name: e.split(":")[1],
        emo : `<${e}>`
      } : {
        name: e,
        emo : e
      }
    );
}

// 起動時の処理
client.on("ready", client => {

  // コマンドを定義
  // ヘルプ
  const data = [
    {
      name: "help",
      description: "View a list of commands.",
    },{
      name: "emoji",
      description: "Search articles by emoji.",
      author: BotId,
      options: [
        {
          "type": 3,
          "name": "target",
          "description": "Enter an emoji which you are looking for.",
          "required": true
        }
      ],
    },{
      name: "delkey",
      description: "Set delete key for bot messages.",
      options: [
        {
          "type": 3,
          "name": "key",
          "description": "Enter an emoji to be the delete key.",
          "required": false
        }
      ],
    }
  ];
  client.application.commands.set(data, "1049173317711568998");

  // 準備完了
  console.log("Ready!");

});


// 送信して削除用リアクション追加
function deletableReply(interaction, content) {

  // リプライ送信
  interaction.reply(content).then(sent => {

    // 送ったメッセージにリアクション
    interaction.channel.messages.fetch({ limit:1 })
      .then(m => m.map(e => e.react(getDeleteKey()))
    );

  });
}



// コマンドに応答
client.on("interactionCreate", (interaction) => {

  // 不正なコマンドは無視
  if(!interaction.isCommand()) return;

  // ヘルプを表示
  if(interaction.commandName === "help") {
    deletableReply(interaction, `ここには何もないようだ...`);
  }

  // 削除キーを設定
  if(interaction.commandName === "delkey") {

    // 引数を抽出
    let arguments = interaction.options._hoistedOptions;
    let content = "";

    if (arguments[0]) {
      // 設定
      const target = splitEmoji(arguments[0].value[0]);
      content = `Set delete key to ${target.emo}`;

      // データベース書き込み
      db.save("deleteKey", target);

    } else {
      // database.jsonから削除キー取得
      content = `Now delete key is setting to ${getDeleteKey()}.（＞＜ ）`;

    }

    // 返信送信
    deletableReply(interaction, content);
  }

  // 未読を表示
  if(interaction.commandName === "emoji") {

    // 引数から検索する絵文字を取得
    const target = splitEmoji(interaction.options._hoistedOptions[0].value);

    console.log(target);

    // 取得メッセージを射影する配列
    let results = [];

    // メッセージを取得
    interaction.channel.messages
      .fetch({ limit: 10 })  // APIの上限
      .then(messages => {

        // メッセージの情報を配列化
        messages.forEach(message => {

          // メッセージのリアクション取得
          message.reactions.cache.map(reacts => {

            // リアクション取得
            const reaction = reacts._emoji.name;

            for (var item of target) {
              if (reaction === item.name) {
                results.push(`( ${item.emo} ) ${message.author} : ${"`"+message.content+"...`"}`);
              }
            }

          });

        })

        //　メッセージ送信
        let matches = results.join("\n");
        if (!matches) matches = "No matches.";

        // Embedオブジェクト作成
        const embed = new EmbedBuilder()
          .setColor(0xFFAA00)
          .setTitle(`${target.map(e => e.emo).join(" ")} の検索結果`)
          .setDescription(matches);

        const content = {embeds: [embed]};

        deletableReply(interaction, content);

      }
    );
  }

});

// ばつリアクションでメッセージ削除
client.on("messageReactionAdd", (reacts, user) => {

  // BOTがリアクションした場合スルー
  if (user.bot) return;
  // ばつ以外のリアクションはスルー
  if (reacts._emoji.name !== splitEmoji(getDeleteKey())[0].name) return;
  // メッセージの送り主がこのBOT以外の場合スルー
  if (reacts.message.author.id !== BotId) return;

  // メッセージを削除
  reacts.message.delete();
})

// Discord へ接続！
client.login(token);
