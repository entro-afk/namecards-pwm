const Discord = require('discord.js');
const Promise = require("bluebird");
const Canvas = require('canvas');

const {hoster_application_channel, hosters_apply_logs, pastebin_dev_key, eido_emoji_guild, notfound_image} = require('../config.json');
const {gatherPlayerStatsQuestions, fetchQuestions} = require('../queries/questions');
const {
  getExistingDiscordCharacterMapping,
  getEidolonsOwned,
  getGearType,
  getGears,
  getSacredBookPic,
  getSoulstones,
  getPneumaPic,
  getMiragiaStore,
  getSageAndDemon,
  getArtifacts
} = require('../queries/character');


module.exports = {
  name: 'profile',
  description: 'Profile View',
  execute(message, args) {
    let requestingUser = message.author;
    let targetUser = requestingUser;
    if (args) {
      if (!isNaN(args[0])) {
        if (args[0].length >= 20) {
          targetUser = {
            discordID: null,
            characterID: args[0]
          };
        }
        else {
          targetUser = {
            discordID: args[0],
            characterID: null
          };
        }
      } else {
        if (!!message.mentions && !!message.mentions.users.size) {
          targetUser = {
            discordID: message.mentions.users.first().id,
            characterID: null
          }
        } else {
          return message.channel.send("Please mention a user or enter a Seeker's discord ID or character ID")
        }
      }
      if (args.length > 1) {
        targetUser.ingameName = args.slice(1).join(" ")
      }
    }
    return Promise.join(
      getExistingDiscordCharacterMapping(targetUser.discordID, targetUser.characterID),
      getEidolonsOwned(targetUser),
      getGears(targetUser),
      getSacredBookPic(targetUser),
      getSoulstones(targetUser),
      getPneumaPic(targetUser),
      getArtifacts(targetUser),
      getSageAndDemon(targetUser),
      getMiragiaStore(targetUser),
      function (discordCharacterIngameMapping, eidolonsOwned, gearPieces, sacredBookSetups, soulstoneSetups, pneumaSetups, artifacts, sageAndDemonDistribution, miragiaStore) {
        if (Array.isArray(discordCharacterIngameMapping)){
          discordCharacterIngameMapping=discordCharacterIngameMapping[0]
        }
        if (!discordCharacterIngameMapping) {
          let personNotFoundEmbed = {
            title: "**That Seeker was not found.**",
            description: `Hey <@!${requestingUser.id}>! We didn't find that seeker.  Feel free to add them using \`+addprofile [ID or mention]\``,
            color: 7506394,
            image: {
              url: notfound_image.url
            },
          };
          return message.channel.send({embed: personNotFoundEmbed})
            .then((newWelcomeMessage) => {
              const oldMessage = message;
              message = newWelcomeMessage;
              return oldMessage.delete()
            })
        }
        targetUser.ingameName = discordCharacterIngameMapping.ingame_name;
        targetUser.profilePicture = discordCharacterIngameMapping.profile_picture;
        let characterInfo = {
          eidolons: eidolonsOwned,
          gear: gearPieces,
          sacredbooks: sacredBookSetups.slice(0, 5),
          soulstones: soulstoneSetups.slice(0, 5),
          pneumas: pneumaSetups.slice(0, 5),
          sageAndDemonDistribution: sageAndDemonDistribution.slice(0, 5),
          miragiaStore: miragiaStore.slice(0, 5),
          artifacts: artifacts.slice(0, 5)
        };
        const designated_pronoun = requestingUser === targetUser ? "your": targetUser.discordID? "<@!"+targetUser.discordID+">'s" :"this Target Seeker's";
        const welcomeEmbed = {
          title: "** **",
          description: `Hey <@!${requestingUser.id}>! Please use the incoming name card to navigate ${designated_pronoun} profile`,
          color: 7506394
        };
        return firstView(message, requestingUser, targetUser, characterInfo)
      }
    );

  },
};

function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {

  if (arguments.length === 2) {
    x = y = 0;
    w = ctx.canvas.width;
    h = ctx.canvas.height;
  }

  // default offset is center
  offsetX = typeof offsetX === "number" ? offsetX : 0.5;
  offsetY = typeof offsetY === "number" ? offsetY : 0.5;

  // keep bounds [0.0, 1.0]
  if (offsetX < 0) offsetX = 0;
  if (offsetY < 0) offsetY = 0;
  if (offsetX > 1) offsetX = 1;
  if (offsetY > 1) offsetY = 1;

  var iw = img.width,
    ih = img.height,
    r = Math.min(w / iw, h / ih),
    nw = iw * r,   // new prop. width
    nh = ih * r,   // new prop. height
    cx, cy, cw, ch, ar = 1;

  // decide which gap to fill
  if (nw < w) ar = w / nw;
  if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh;  // updated
  nw *= ar;
  nh *= ar;

  // calc source rectangle
  cw = iw / (nw / w);
  ch = ih / (nh / h);

  cx = (iw - cw) * offsetX;
  cy = (ih - ch) * offsetY;

  // make sure source rectangle is valid
  if (cx < 0) cx = 0;
  if (cy < 0) cy = 0;
  if (cw > iw) cw = iw;
  if (ch > ih) ch = ih;

  // fill image in dest. rectangle
  ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
}

const applyText = (canvas, text) => {
  const ctx = canvas.getContext('2d');

  // Declare a base size of the font
  let fontSize = 48;
  ctx.font = `${fontSize}px 'WenQuanYi Micro Hei'`;
  do {
    // Assign the font to the context and decrement it so it can be measured again
    ctx.font = `${fontSize -= 10}px 'WenQuanYi Micro Hei'`;
    // Compare pixel width of the text to the canvas minus the approximate avatar size
  } while (ctx.measureText(text).width > canvas.width - 300);

  // Return the result to use in the actual canvas
  return ctx.font;
};

function firstView(message, requestingUser, targetUser, characterInfo) {
  let classRole = null;
  let characterIDPortion = targetUser.discordID && `Discord ID: <@!${targetUser.discordID}>` || "";
  let ingameName = targetUser.ingameName && `IGN: ${targetUser.ingameName}` || "";
  let number_emojis = [
    '1️⃣',
    '2️⃣',
    '3️⃣',
    '4️⃣',
    '5️⃣',
    '6️⃣',
    '7️⃣',
    '8️⃣',
    '9️⃣',
    '🔟'
  ];
  let menu_choices = [
    // "Artifacts",
    characterInfo.eidolons && characterInfo.eidolons.length && "Eidolons",
    characterInfo.gear && characterInfo.gear.length && "Gear",
    characterInfo.pneumas && characterInfo.pneumas.length && "Pneumas",
    characterInfo.sacredbooks && characterInfo.sacredbooks.length && "Sacred Books",
    characterInfo.soulstones && characterInfo.soulstones.length && "Soulstones",
    characterInfo.artifacts && characterInfo.artifacts.length &&   "Artifacts",
    characterInfo.sageAndDemonDistribution && characterInfo.sageAndDemonDistribution.length &&  "Sage & Demon",
    characterInfo.miragiaStore && characterInfo.miragiaStore.length &&   "Miragia Store",
    // "Fashion and Skins Gallery",
    // "Additional Notes
  ];
  menu_choices = menu_choices.filter(choice => !!choice);
  let menu_numbered_choices = [];
  let index_menu = 0;
  let reaction_numbers = [];
  let reaction_to_menu_choice_mapping = {};
  for (let choice of menu_choices) {
    menu_numbered_choices.push(`${number_emojis[index_menu]} ${choice}`);
    reaction_numbers.push(number_emojis[index_menu]);
    reaction_to_menu_choice_mapping[number_emojis[index_menu]] = choice;
    index_menu++;
  }
  let menu_embed = {
    "title": "** **",
    "description": `${ingameName}\n${characterIDPortion}`,
    "color": 7506394,
    "fields": [
      {
        "name": "** **",
        "value": menu_numbered_choices.join("\n")
      }
    ],
    "author": {
      "name": `${requestingUser.username} is navigating ${targetUser.ingameName || 'someone'}'s namecard`
}
  };
  return message.reactions.removeAll()
    .then(messageRes => {
      const canvas = Canvas.createCanvas(1200, 628);
      const ctx = canvas.getContext('2d');
      let background = null;
      return Promise.join(
        Canvas.loadImage('./assets/grayishblackbackground.png'),
        !!targetUser.profilePicture && Canvas.loadImage(targetUser.profilePicture) || null,
        (canvasImg, profilePic) => {
          background = canvasImg;
          ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

          if (!!profilePic) {
            drawImageProp(ctx, profilePic, 400, 0, canvas.width-400, canvas.height);
          }
          let plainNumberChoices = [];
          let i = 1;
          for (let choice of menu_choices) {
            plainNumberChoices.push(`${i}. ${choice}`);
            i+=1
          }
          const plainNumberChoicesString = plainNumberChoices.join("\n");
          let stringPart = plainNumberChoicesString;
          if (!!targetUser.ingameName) {
            stringPart = `${targetUser.ingameName}'s Stats\n${plainNumberChoicesString}`;
          }
          ctx.font = applyText(canvas, stringPart);
          ctx.fillStyle = '#ffffff';
          ctx.fillText(stringPart, 40, 150);

          const attachment = new Discord.MessageAttachment(canvas.toBuffer(), 'profile-image.png');
          if (!!targetUser.profilePicture) {
            return message.delete()
              .then(() => message.channel.send("", attachment))
          }
          return ((!message.embeds.length && message.channel.send({embed: menu_embed})) || message.edit({embed: menu_embed}))
        })
        .then()
        .then(function handleMenuMessage(messageMenu) {
          targetUser.lastView = messageMenu;
          return Promise.each(reaction_numbers, (reactionNumber) => targetUser.lastView.react(reactionNumber))
        })
        .then(function(){
          const filter = (reaction, user) => (reaction_numbers.includes(reaction.emoji.name) || reaction_numbers.includes(reaction.emoji)) && user.id === requestingUser.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
          return targetUser.lastView.awaitReactions(filter, { max: 1})
            .then(function handleNextView(reactionChoice) {
              reactionChoice = reactionChoice.first().emoji;
              switch (reaction_to_menu_choice_mapping[reactionChoice]) {
                case "Eidolons":
                  return eidolonView(targetUser.lastView, requestingUser, targetUser, characterInfo);
                case "Gear":
                  return gearView(targetUser.lastView, requestingUser, targetUser, characterInfo);
                case "Sacred Books":
                  return buildSacredBooksSoulstonesView(targetUser.lastView, requestingUser, targetUser, characterInfo, 'sacred books');
                case "Soulstones":
                  return buildSacredBooksSoulstonesView(targetUser.lastView, requestingUser, targetUser, characterInfo, 'soulstones');
                case "Pneumas":
                  return buildSacredBooksSoulstonesView(targetUser.lastView, requestingUser, targetUser, characterInfo, 'pneumas');
                case "Sage & Demon":
                  return buildSacredBooksSoulstonesView(targetUser.lastView, requestingUser, targetUser, characterInfo, 'sage and demon');
                case "Miragia Store":
                  return buildSacredBooksSoulstonesView(targetUser.lastView, requestingUser, targetUser, characterInfo, 'miragia store');
                case "Artifacts":
                  return buildSacredBooksSoulstonesView(targetUser.lastView, requestingUser, targetUser, characterInfo, 'artifacts');



              }
            })
        })
    })
}

function gearView(message, requestingUser, targetUser, characterInfo) {
  let characterIDPortion = targetUser.discordID && `Discord ID: <@!${targetUser.discordID}>` || "";
  let ingameName = targetUser.ingameName && `IGN: ${targetUser.ingameName}` || "";
  let menu_choices = [];
  for (let charGear of characterInfo.gear) {
    menu_choices.push(charGear.gear_type)
  }
  let number_emojis = [
    '1️⃣',
    '2️⃣',
    '3️⃣',
    '4️⃣',
    '5️⃣',
    '6️⃣',
    '7️⃣',
    '8️⃣',
    '9️⃣',
    '🔟',
    '🔴',
    '🟧',
    '🔹',
    '🟣',
    '🟨'
  ];
  let menu_numbered_choices = [];
  let index_menu = 0;
  let reaction_numbers = ['🏠', "◀️"];
  let reaction_to_menu_choice_mapping = {"🏠": "Home" , "◀️": "Back"};
  for (let choice of menu_choices) {
    menu_numbered_choices.push(`${number_emojis[index_menu]} ${choice}`);
    reaction_numbers.push(number_emojis[index_menu]);
    reaction_to_menu_choice_mapping[number_emojis[index_menu]] = choice;
    index_menu++;
  }
  let menu_embed = {
    "title": "** **",
    "description": `${ingameName}\n${characterIDPortion}`,
    "color": 7506394,
    "fields": [
      {
        "name": "** **",
        "value": menu_numbered_choices.join("\n")
      }
    ],
    "author": {
      "name": `${requestingUser.username} is navigating ${targetUser.ingameName || 'someone'}'s namecard`
    }
  };
  return message.reactions.removeAll()
    .then(function(resultMessage) {
      return Promise.each(reaction_numbers, (reactionNumber) => resultMessage.react(reactionNumber))
        .return(resultMessage)
    })
    .then((msgMenu)=> message.edit({embed: menu_embed}))
    .then(function handleMenuMessage(messageMenu) {
      targetUser.lastView = messageMenu;
    })
    .then(function(){
      const filter = (reaction, user) => (reaction_numbers.includes(reaction.emoji.name) || reaction_numbers.includes(reaction.emoji)) && user.id === requestingUser.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
      return targetUser.lastView.awaitReactions(filter, { max: 1})
        .then(function handleNextView(reactionChoice) {
          reactionChoice = reactionChoice.first().emoji;
          switch(reactionChoice.name) {
            case '🏠':
              return firstView(targetUser.lastView, requestingUser, targetUser, characterInfo);
            default:
              return buildGearView(reaction_to_menu_choice_mapping[reactionChoice], message, requestingUser, targetUser, characterInfo)
          }
        })
    })
}

function eidolonView(message, requestingUser, targetUser, characterInfo) {
  let classRole = null;
  let characterIDPortion = targetUser.discordID && `Discord ID: <@!${targetUser.discordID}>` || "";
  let ingameName = targetUser.ingameName && `IGN: ${targetUser.ingameName}` || "";

  let number_emojis = [
    '1️⃣',
    '2️⃣',
  ];
  let eidolons = ['cucu', 'flamerider', 'earthstrider', 'oakspirit', 'spitfire', 'siren', 'goblin', 'junglewyvern', 'monkeyking', 'aeriola', 'ninetails', 'frostdragon', 'nezha', 'gigi', 'pokermaster'];
  const eido_emoji_mapping = {
    "Cucurbit": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="cucu"),
    "Flame Rider": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="flamerider"),
    "Earthstrider": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="earthstrider"),
    "Oak Spirit": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="oakspirit"),
    "Spitfire": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="spitfire"),
    "Siren": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="siren"),
    "Goblin": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="goblin"),
    "Jungle Wyvern": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="junglewyvern"),
    "Monkey King": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="monkeyking"),
    "Aeriola": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="aeriola"),
    "Nine Tails": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="ninetails"),
    "Frost Dragon": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="frostdragon"),
    "Nezha": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="nezha"),
    "Gigi": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="gigi"),
    "Poker Master": targetUser.lastView.author.client.emojis.cache.find(emoji => emoji.name ==="pokermaster"),
  };

  let menu_choices = [
  ];
  let menu_numbered_choices = [];
  let index_menu = 0;
  let reaction_numbers = ['🏠'];
  let reaction_to_menu_choice_mapping = {"🏠": 'Home'};
  for (let choice of characterInfo.eidolons) {
    menu_numbered_choices.push(`${eido_emoji_mapping[choice.eidolon_name]} ${choice.eidolon_name}`);
    reaction_numbers.push(eido_emoji_mapping[choice.eidolon_name]);
    reaction_to_menu_choice_mapping[eido_emoji_mapping[choice.eidolon_name]] = choice.eidolon_name;
    index_menu++;
  }
  let menu_embed = {
    "title": "** **",
    "description": `${ingameName}\n${characterIDPortion}`,
    "color": 7506394,
    "fields": [
      {
        "name": "**Eidolons Owned**",
        "value": menu_numbered_choices.join("\n")
      }
    ],
    "author": {
      "name": `${requestingUser.username} is navigating ${targetUser.ingameName || 'someone'}'s namecard`
}
  };
  return message.reactions.removeAll()
    .then(function(resultMessage) {
      return Promise.each(reaction_numbers, (reactionNumber) => resultMessage.react(reactionNumber))
        .return(resultMessage)
    })
    .then((msgMenu)=> message.edit({embed: menu_embed}))
    .then(function handleMenuMessage(messageMenu) {
      targetUser.lastView = messageMenu;
    })
    .then(function(){
      const filter = (reaction, user) => (reaction_numbers.includes(reaction.emoji.name) || reaction_numbers.includes(reaction.emoji)) && user.id === requestingUser.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
      return targetUser.lastView.awaitReactions(filter, { max: 1})
        .then(function handleNextView(reactionChoice) {
          reactionChoice = reactionChoice.first().emoji;
          switch(reactionChoice.name) {
            case '🏠':
              return firstView(targetUser.lastView, requestingUser, targetUser, characterInfo);
            default:
              return buildEidolonView(reaction_to_menu_choice_mapping[reactionChoice], message, requestingUser, targetUser, characterInfo)
          }
        })
    })

}

function buildSacredBooksSoulstonesView(message, requestingUser, targetUser, characterInfo, process) {
  const title_process = process.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())))
  let pictures = [];
  let timestampMostRecent;
  switch (process) {
    case 'sacred books':
      timestampMostRecent=characterInfo.sacredbooks[0].last_updated;
      pictures = characterInfo.sacredbooks.map(book => book.sacredbooks_setup);
      break;
    case 'soulstones':
      timestampMostRecent=characterInfo.soulstones[0].last_updated;
      pictures = characterInfo.soulstones.map(stone => stone.soulstones_pic_link);
      break;
    case 'pneumas':
      timestampMostRecent=characterInfo.pneumas[0].last_updated;
      pictures = characterInfo.pneumas.map(stone => stone.pneuma_setup);
      break;
    case 'sage and demon':
      timestampMostRecent=characterInfo.sageAndDemonDistribution[0].last_updated;
      pictures = characterInfo.sageAndDemonDistribution.map(sagedemon => sagedemon.sage_and_demon_pic);
      break;
    case 'miragia store':
      timestampMostRecent=characterInfo.miragiaStore[0].last_updated;
      pictures = characterInfo.miragiaStore.map(miragia => miragia.miragia_store_pic);
      break;
    case 'artifacts':
      timestampMostRecent=characterInfo.artifacts[0].last_updated;
      pictures = characterInfo.artifacts.map(pic => pic.artifacts);
      break;

  }
  let characterIDPortion = targetUser.discordID && `Discord ID: <@!${targetUser.discordID}>` || "";
  let ingameName = targetUser.ingameName && `IGN: ${targetUser.ingameName}` || "";
  let reaction_numbers = ['🏠'];

  let menu_embed = {
    "title": `**${title_process}**`,
    "description": `${ingameName}\n${characterIDPortion}`,
    "color": 7506394,
    "author": {
      "name": `${requestingUser.username} is navigating ${targetUser.ingameName || 'someone'}'s namecard`
},
    "image": {
      "url": pictures[0]
    },
    "timestamp": timestampMostRecent
  };
  if (pictures.length >=2) {
    menu_embed["fields"] = [{
      "name": "Pictures",
      "value": pictures
    }]
  }
  return message.reactions.removeAll()
    .then(function(resultMessage) {
      return Promise.each(reaction_numbers, (reactionNumber) => resultMessage.react(reactionNumber))
        .return(resultMessage)
    })
    .then((msgMenu)=> message.edit({embed: menu_embed}))
    .then(function handleMenuMessage(messageMenu) {
      targetUser.lastView = messageMenu;
    })
    .then(function(){
      const filter = (reaction, user) => (reaction_numbers.includes(reaction.emoji.name) || reaction_numbers.includes(reaction.emoji)) && user.id === requestingUser.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
      return targetUser.lastView.awaitReactions(filter, { max: 1})
        .then(function handleNextView(reactionChoice) {
          reactionChoice = reactionChoice.first().emoji;
          switch(reactionChoice.name) {
            case '🏠':
              return firstView(targetUser.lastView, requestingUser, targetUser, characterInfo);
          }
        })
    })

}


function buildGearView(gear_type, message, requestingUser, targetUser, characterInfo) {
  const title_gear_type = gear_type.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())))
  let gearPieceObj = characterInfo.gear.filter((gearpiece) => gearpiece.gear_type === gear_type)[0];
  let characterIDPortion = targetUser.discordID && `Discord ID: <@!${targetUser.discordID}>` || "";
  let ingameName = targetUser.ingameName && `IGN: ${targetUser.ingameName}` || "";
  let reaction_numbers = ['🏠', "◀️"];

  let menu_embed = {
    "title": `**${title_gear_type} Build**`,
    "description": `${ingameName}\n${characterIDPortion}`,
    "color": 7506394,
    "author": {
      "name": `${requestingUser.username} is navigating ${targetUser.ingameName || 'someone'}'s namecard`
    },
    "image": {
      "url": gearPieceObj.gear_pic
    },
    "timestamp": gearPieceObj.last_updated,
    "footer": {
      "text": "Last Updated"
    }
  };
  if (gear_type === "ring") {
    let gearPieces = characterInfo.gear.filter((gearpiece) => gearpiece.gear_type === gear_type);
    if (gearPieces.length >=2) {
      delete menu_embed["image"];
      menu_embed["fields"] = [{
        "name": "Rings",
        "value": gearPieces.map((gearpiece)=>gearpiece.gear_pic).join("\n")
      }]
    }
  }
  return message.reactions.removeAll()
    .then(function(resultMessage) {
      return Promise.each(reaction_numbers, (reactionNumber) => resultMessage.react(reactionNumber))
        .return(resultMessage)
    })
    .then((msgMenu)=> message.edit({embed: menu_embed}))
    .then(function handleMenuMessage(messageMenu) {
      targetUser.lastView = messageMenu;
    })
    .then(function(){
      const filter = (reaction, user) => (reaction_numbers.includes(reaction.emoji.name) || reaction_numbers.includes(reaction.emoji)) && user.id === requestingUser.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
      return targetUser.lastView.awaitReactions(filter, { max: 1})
        .then(function handleNextView(reactionChoice) {
          reactionChoice = reactionChoice.first().emoji;
          switch(reactionChoice.name) {
            case '🏠':
              return firstView(targetUser.lastView, requestingUser, targetUser, characterInfo);
            case "◀️":
              return gearView(targetUser.lastView, requestingUser, targetUser, characterInfo)
          }
        })
    })

}

function buildEidolonView(eidolonName, message, requestingUser, targetUser, characterInfo) {
  let eidolonObj = characterInfo.eidolons.filter((eidolon) => eidolon.eidolon_name === eidolonName)[0];
  let characterIDPortion = targetUser.discordID && `Discord ID: <@!${targetUser.discordID}>` || "";
  let ingameName = targetUser.ingameName && `IGN: ${targetUser.ingameName}` || "";

  let number_emojis = [
    '1️⃣',
    '2️⃣',
  ];
  let menu_choices = [
    !!eidolonObj.eidolon_skills && "Eidolons Skills",
    !!eidolonObj.eidolon_elixirs && "Eidolons Elixirs",
  ];
  menu_choices = menu_choices.filter(choice => !!choice);
  let menu_numbered_choices = [];
  let index_menu = 0;
  let reaction_numbers = ['🏠', "◀️"];;
  let reaction_to_menu_choice_mapping = {"🏠": "Home" , "◀️": "Back"};
  for (let choice of menu_choices) {
    menu_numbered_choices.push(`${number_emojis[index_menu]} ${choice}`);
    reaction_numbers.push(number_emojis[index_menu]);
    reaction_to_menu_choice_mapping[number_emojis[index_menu]] = choice;
    index_menu++;
  }
  let timestampMostRecent=characterInfo.eidolons[0].last_updated;
  let menu_embed = {
    "title": "**  **",
    "description": `${ingameName}\n${characterIDPortion}`,
    "color": 7506394,
    "fields": [
      {
        "name": `**${eidolonName} Stats Build**`,
        "value": menu_numbered_choices.join("\n")
      }
    ],
    "author": {
      "name": `${requestingUser.username} is navigating ${targetUser.ingameName || 'someone'}'s namecard`
    },
    "timestamp": timestampMostRecent,
    "footer": {
      "text": "Last Updated"
    }
  };
  return message.reactions.removeAll()
    .then(function(resultMessage) {
      return Promise.each(reaction_numbers, (reactionNumber) => resultMessage.react(reactionNumber))
        .return(resultMessage)
    })
    .then((msgMenu)=> message.edit({embed: menu_embed}))
    .then(function handleMenuMessage(messageMenu) {
      targetUser.lastView = messageMenu;
    })
    .then(function(){
      const filter = (reaction, user) => (reaction_numbers.includes(reaction.emoji.name) || reaction_numbers.includes(reaction.emoji)) && user.id === requestingUser.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
      return targetUser.lastView.awaitReactions(filter, { max: 1})
        .then(function handleNextView(reactionChoice) {
          reactionChoice = reactionChoice.first().emoji;
          switch(reactionChoice.name) {
            case '🏠':
              return firstView(targetUser.lastView, requestingUser, targetUser, characterInfo);
            case "◀️":
              return eidolonView(targetUser.lastView, requestingUser,targetUser,characterInfo);
            default:
              switch (reaction_to_menu_choice_mapping[reactionChoice]) {
                case 'Eidolons Skills':
                  return buildEidolonSkillsElixirsView(eidolonName, targetUser.lastView, requestingUser, targetUser, characterInfo, 'skills');
                case 'Eidolons Elixirs':
                  return buildEidolonSkillsElixirsView(eidolonName, targetUser.lastView, requestingUser, targetUser, characterInfo, 'elixirs');
              }
          }
        })
    })

}

function buildEidolonSkillsElixirsView(eidolonName, message, requestingUser, targetUser, characterInfo, process) {
  const title_process = process.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())))
  let eidolonObj = characterInfo.eidolons.filter((eidolon) => eidolon.eidolon_name === eidolonName)[0];
  let characterIDPortion = targetUser.discordID && `Discord ID: <@!${targetUser.discordID}>` || "";
  let ingameName = targetUser.ingameName && `IGN: ${targetUser.ingameName}` || "";
  let reaction_numbers = ['🏠', "◀️"];

  let menu_embed = {
    "title": `**${eidolonName} ${title_process} Build**`,
    "description": `${ingameName}\n${characterIDPortion}`,
    "color": 7506394,
    "author": {
      "name": `${requestingUser.username} is navigating ${targetUser.ingameName || 'someone'}'s namecard`
},
  };
  switch (process) {
    case 'skills':
      menu_embed['image'] = {
        "url": !!eidolonObj.eidolon_skills && JSON.parse(eidolonObj.eidolon_skills)[0].url
      };
      break;
    case 'elixirs':
      menu_embed['image'] = {
        "url": !!eidolonObj.eidolon_elixirs && JSON.parse(eidolonObj.eidolon_elixirs)[0].url
      };
      break;
    default:
      menu_embed['fields'] = [{
        "name": `**  **`,
        "value": "No pictures provided"
      }]
  }
  return message.reactions.removeAll()
    .then(function(resultMessage) {
      return Promise.each(reaction_numbers, (reactionNumber) => resultMessage.react(reactionNumber))
        .return(resultMessage)
    })
    .then((msgMenu)=> message.edit({embed: menu_embed}))
    .then(function handleMenuMessage(messageMenu) {
      targetUser.lastView = messageMenu;
    })
    .then(function(){
      const filter = (reaction, user) => (reaction_numbers.includes(reaction.emoji.name) || reaction_numbers.includes(reaction.emoji)) && user.id === requestingUser.id; //whatever emote you want to use, beware that .await.Reactions can only check a singel emote
      return targetUser.lastView.awaitReactions(filter, { max: 1})
        .then(function handleNextView(reactionChoice) {
          reactionChoice = reactionChoice.first().emoji;
          switch(reactionChoice.name) {
            case '🏠':
              return firstView(targetUser.lastView, requestingUser, targetUser, characterInfo);
            case "◀️":
              return buildEidolonView(eidolonName, targetUser.lastView, requestingUser, targetUser, characterInfo)
          }
        })
    })
}