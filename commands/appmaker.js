const Discord = require('discord.js');
const Promise = require("bluebird");
const {hoster_application_channel, hosters_apply_logs, pastebin_dev_key, ready_image_author_name, ready_image} = require('../config.json');
const {gatherPlayerStatsQuestions, fetchQuestions} = require('../queries/questions');
const {
  recordEidolonNameOwned,
  getExistingDiscordCharacterMapping,
  addDiscordCharacterMapping,
  getEidolonsOwned,
  recordEidolonSkills,
  recordSoulstonePic,
  recordGearPic,
  getGearType,
  updateGear,
  getGears,
  recordSacredBookPic,
  recordPneumaPic,
  getPneumaPic,
  recordSageAndDemon,
  recordMiragiaStore,
  updateProfilePic,
  recordArtifacts
} = require('../queries/character');
const PastebinAPI = require('pastebin-ts');
const pastebin = new PastebinAPI(pastebin_dev_key);

module.exports = {
  name: 'addprofile',
  description: 'Menu',
  execute(message, args) {
    let requestingUser = message.author;
    let targetUser = requestingUser;
    if (args) {
      if (!isNaN(args[0])) {
        if (len(args) >= 20) {
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
        if (!!message.mentions) {
          targetUser = {
            discordID: message.mentions.users.first().id,
            characterID: null
          }
        } else {
          if (args.trim() && isNaN(args.trim()[0])) {
            return message.channel.send("Please mention a user or enter a Seeker's discord ID or character ID")
          }
          else if (!args.length) {
            targetUser = requestingUser;
            targetUser.discordID = requestingUser.id
          }
        }
      }
      if (args.length > 1 ) {
        targetUser.ingameName = args.slice(1).join(" ")
      }
    }
    const welcomeEmbed = {
      title: "**Thanks for choosing to add to our database!**",
      description: `Hey <@!${requestingUser.id}>!  We'll ask you some questions regarding ${requestingUser === targetUser ? "your": targetUser.discordID? "<@!"+targetUser.discordID+">'s" :"this Target Seeker's"} eidolon builds, pneumas, sacred books, and other character progression builds.`,
      color: 7506394
    };
    return message.channel.send({embed: welcomeEmbed})
      .then((newWelcomeMessage) => {
        const oldMessage = message;
        message = newWelcomeMessage;
        return oldMessage.delete({timeout: 2000})
      })
      .then(() => getExistingDiscordCharacterMapping(targetUser.discordID, targetUser.characterID))
      .then((existingMapping) => {
        if (Array.isArray(existingMapping)) {
          existingMapping=existingMapping[0]
        }
        if(!existingMapping){
          return addDiscordCharacterMapping(targetUser.discordID, targetUser.characterID, targetUser.ingameName)
        } else if (!existingMapping.ingame_name) {
          return addDiscordCharacterMapping(existingMapping.discord_id.toString(), existingMapping.character_id.toString(), targetUser.ingameName, existingMapping.profile_picture)
        }
        if (existingMapping.discord_id == 0 && existingMapping.character_id !== 0 && targetUser !== requestingUser) {
          return addDiscordCharacterMapping(targetUser.discordID, existingMapping.character_id.toString(), targetUser.ingameName, existingMapping.profile_picture)
        }
        return existingMapping
      })
      .then((existingMapping) => {
        if (!!existingMapping) {
          let profileRequestEmbed;
          if (!existingMapping.profile_picture) {
            profileRequestEmbed = {
              "title": "Please upload a profile picture",
              "description": "Please upload a profile picture the bot can use for your name card <a:aeuphoria_bow:775194882607546368>",
              "color": 7506394,
              "footer": {
                "text": "Please type \"next\" anytime to move on to the next prompt."
              }
            }
          } else {
            profileRequestEmbed = {
              "title": "Would you like to update your profile picture? (Please type next to skip)",
              "description": "This is your current profile picture: <a:aeuphoria_bow:775194882607546368>",
              "color": 7506394,
              "image": {
                "url": existingMapping.profile_picture
              },
              "footer": {
                "text": "Please type \"next\" anytime to move on to the next prompt."
              }
            }
          }
          return !!profileRequestEmbed && message.channel.send({embed: profileRequestEmbed})
            .then(function waitForProfilePic() {
              filter = m => m.author.id === requestingUser.id && (!!m.embeds.length || !!m.attachments.size || m.content.trim().toLowerCase() === "next")

              targetUser.ingameName = existingMapping.ingame_name;
              return message.channel.awaitMessages(filter, {
                max: 1,
                time: 600000,
                errors: ['time']
              })
                .then(awaitedMsg => {
                  awaitedMsg = awaitedMsg.first();
                  if (awaitedMsg.content.trim().toLowerCase() === "next" && !awaitedMsg.attachments.size) {
                    return
                  }
                  if (!!awaitedMsg.attachments.size || !!awaitedMsg.embeds.length) {
                    return updateProfilePic(targetUser.discordID, targetUser.characterID,  !!awaitedMsg.attachments.size && awaitedMsg.attachments.array()[0].url || !!awaitedMsg.embeds.length && awaitedMsg.embeds[0].url)
                  }
                })
            })
        }
      })
      .then((existingMapping)=> {
        return Promise.each(fetchQuestions(), function sendQuestion(question) {
          const json_question =JSON.parse(question['question_embed']);

          return handleQuestion(question, json_question, message, requestingUser, targetUser)
            .catch((err)=>console.log(err))
        })

      })
      .then(() => {
        const finishingEmbed = {
          "title": "**Thanks for contributing!**",
          "description": "This Seeker's stats has been recorded.\nThe newbies of PWM will be eternally grateful to you.\nYou can view this profile by:\n`+profile [ID or mention]`",
          "color": 4437377,
          "image": {
            "url": ready_image
          },
          "footer": {
            "text": `This screenshot was taken by ${ready_image_author_name}.`
          }
        };
        return message.channel.send({embed: finishingEmbed})
      })

  },
};
function handleUpdateSkills(question, question_embed, call_message, requestingUser, targetUser, ownedEidolon) {
  question_embed.title = `${ownedEidolon.eidolon_name} Build: Skills`;
  question_embed.description = `Please share a screenshot on how you built your ${ownedEidolon.eidolon_name}'s skils.\nLike the one shown below:\n`;
  targetUser.currentEidolon= ownedEidolon;
  return call_message.channel.send({embed: question_embed})
    .then((question_message) => handleResponse(question_message, question, requestingUser, targetUser))

}

function handleUpdateElixirs(question, question_embed, call_message, requestingUser, targetUser, ownedEidolon) {
  question_embed.title = `${ownedEidolon.eidolon_name} Build: Elixirs`;
  question_embed.description = `Please share a screenshot on how you built your ${ownedEidolon.eidolon_name}'s Elixirs.\nLike the one shown below:\n`;
  targetUser.currentEidolon= ownedEidolon;
  return call_message.channel.send({embed: question_embed})
    .then((question_message) => handleResponse(question_message, question, requestingUser, targetUser))

}

function handleQuestion(question, question_embed, call_message, requestingUser, targetUser) {
  switch (question.question_label) {
    case 'eidolon-skills':
      return Promise.each(getEidolonsOwned(targetUser), function (ownedEidolon) {
        if (targetUser.eidolonBuildWishes && targetUser.eidolonBuildWishes.includes(ownedEidolon.eidolon_name)) {
          return Promise.resolve(!!ownedEidolon.eidolon_skills ? overrideCurrentStatsModal(call_message, question, requestingUser, targetUser, ownedEidolon) : true)
            .then((overrides) => !!overrides && handleUpdateSkills(question, question_embed, call_message, requestingUser, targetUser, ownedEidolon) || null)
        }
      });
    case 'eidolon-elixirs':
      return Promise.each(getEidolonsOwned(targetUser), function (ownedEidolon) {
        if (targetUser.eidolonBuildWishes && targetUser.eidolonBuildWishes.includes(ownedEidolon.eidolon_name)) {
          return Promise.resolve(!!ownedEidolon.eidolon_elixirs ? overrideCurrentStatsModal(call_message, question, requestingUser, targetUser, ownedEidolon) : true)
            .then((overrides) => (!!overrides && handleUpdateElixirs(question, question_embed, call_message, requestingUser, targetUser, ownedEidolon) || null))
        }
      });
    case 'eidolon-selection':
      const waiting_question_embed = {
        title: "Please wait until Jise finds all the available Eidolons that Seekers can catch..."
      };
      return call_message.channel.send({embed: waiting_question_embed})
        .then((question_message) => handleEidoSelectionQuestion(question_embed, question_message, question, requestingUser, targetUser));

    default:
      return call_message.channel.send({embed: question_embed})
        .then((question_message) => handleResponse(question_message, question, requestingUser, targetUser))
  }
}

function handleEidoSelectionQuestion(question_embed, prompt_message, question, requestingUser, targetUser) {
  const reaction_eidolons = prompt_message.author.client.emojis.cache.filter(emoji => ['cucu', 'flamerider', 'earthstrider', 'oakspirit', 'spitfire', 'siren', 'junglewyvern', 'monkeyking', 'aeriola', 'ninetails', 'frostdragon', 'nezha', 'gigi', 'pokermaster'].includes(emoji.name));
  const map = new Map();
  const unique_reaction_eidolons = [];
  let search_emoji = ['cucu', 'flamerider', 'earthstrider', 'oakspirit', 'spitfire', 'siren', 'junglewyvern', 'monkeyking', 'aeriola', 'ninetails', 'frostdragon', 'nezha', 'gigi', 'pokermaster'];
  for (const emoji_name of search_emoji) {
    if(!map.has(emoji_name)){
      map.set(emoji_name, true);    // set any value to Map
    }
  }
  for (const emoji of reaction_eidolons) {
    if(map.has(emoji[1].name)){
      unique_reaction_eidolons[search_emoji.indexOf(emoji[1].name)] = emoji[1];
      map.delete(emoji[1].name)
    }
  }
  return Promise.each(unique_reaction_eidolons, function forEachEmojiReact(emoji){
    return prompt_message.react(emoji)
  })
    .then(() => prompt_message.edit({embed: question_embed}))
    .then(()=>handleResponse(prompt_message, question, requestingUser, targetUser))

}
function handleResponse(prompt_message, question, requestingUser, targetUser){
  let filter;
  switch (question.question_label) {
    case 'eidolon-selection':
        return handleEidoReactions(prompt_message, requestingUser, targetUser);
    case 'eidolon-skills':
      return updateEidolonSkillsStats(prompt_message, question, requestingUser, targetUser);
    case 'eidolon-elixirs':
      filter = m => m.author.id === requestingUser.id && (!!m.embeds.length || !!m.attachments.size || m.content.trim().toLowerCase() === "next") ;
      return prompt_message.channel.awaitMessages(filter, {
        max: 1,
        time: 600000,
        errors: ['time']
      })
        .then(message => {
          message = message.first();
          if (message.content.trim().toLowerCase() === "next" && !message.attachments.size) {
            return
          }
          return handleEidolonUpdateMsg(question.question_label, message, targetUser)
            .then(() => {
              return message.channel.send({embed: {
                  "title": `Screenshot for ${targetUser.currentEidolon} Recorded`,
                  "description": `<@!${requestingUser.id}>, we've recorded your screenshot for this target Seeker's ${targetUser.currentEidolon.eidolon_name} Elixirs`,
                  "color": 4437377
                }})
            })
        })
        .catch(collected => {
          console.log(collected)
        });
    case 'gear':
    case 'pneumas':
    case 'sacred-books':
    case 'soulstones':
    case 'sage-and-demon':
    case 'miragia-store':
    case 'artifacts':
      return handleSoulstonesAndGearResponse(prompt_message, question, requestingUser, targetUser)

  }
}

function handleSoulstonesAndGearResponse(prompt_message, question, requestingUser, targetUser) {
  filter = m => m.author.id === requestingUser.id && (!!m.embeds.length || !!m.attachments.size || m.content.trim().toLowerCase() === "next") ;
  return prompt_message.channel.awaitMessages(filter, {
    max: 1,
    time: 600000,
    errors: ['time']
  })
    .then(message => {
      message = message.first();
      if (message.content.trim().toLowerCase() === "next" && !message.attachments.size) {
        return
      }
      return handleScreenshots(question.question_label, message, requestingUser, targetUser)
        .then(() => message.content.trim().toLowerCase() !== "next" && handleSoulstonesAndGearResponse(prompt_message, question, requestingUser, targetUser))
    })
    .catch(collected => {
      console.log(collected)
    });
}

function handleScreenshots(process, message, requestingUser, targetUser) {
  if (['soulstones', 'gear', 'sacred-books', 'pneumas', 'sage-and-demon', 'miragia-store', 'artifacts'].includes(process)) {
    const pics_array = !!message.attachments.size && message.attachments.array() || message.embeds;
    let gear_type = 'unsorted';
    let process_title =  process.replace(/-/g, " ").replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
    return Promise.each(pics_array, function recordSoulstoneScreenshot(pic) {
      return Promise.resolve(null)
        .then(function handleCasesProcess(){
          switch (process) {
            case 'soulstones':
              return recordSoulstonePic(targetUser, pic.url);
            case 'sacred-books':
              return recordSacredBookPic(targetUser, pic.url);
            case 'artifacts':
              return recordArtifacts(targetUser, pic.url);
            case 'sage-and-demon':
              process_title += " Distribution";
              return recordSageAndDemon(targetUser, pic.url);
            case 'miragia-store':
              return recordMiragiaStore(targetUser, pic.url);
            case 'pneumas':
              return recordPneumaPic(targetUser, pic.url);
            case 'gear':
              return getGearType(targetUser, pic.url)
                .then(function(result) {
                  gear_type = result['gear_type'];
                  return getGears(targetUser, result['gear_type'])
                })
                .then(function handleResultGear(resultGears) {
                  if (!resultGears.length) {
                    return recordGearPic(targetUser, pic.url)
                  }
                  return Promise.each((resultGears), function(resultGear){
                    if (resultGears.length < 2 && resultGear['gear_type'] === 'rings') {
                      return recordGearPic(targetUser, pic.url)
                    }
                    return overrideCurrentGearModal(message, process, requestingUser, targetUser, resultGear)
                      .then(function (overrides) {
                        if (!overrides) {
                          return updateGear(targetUser, resultGear.gear_pic, pic.url, resultGear.gear_type)
                        }
                        return null
                      })
                  })
                })
          }
        })
        .then((result) => {
          if (!!result && !!result.length) {

            return message.channel.send({embed: {
                "title": `Screenshot for [Process: ${process}] Recorded`,
                "description": `<@!${requestingUser.id}>, we've recorded your screenshot for this target Seeker's ${process==='gear'? gear_type + ' gear' : process_title}.\nKeep on uploading pictures of your ${process} or type "next" if you're done.`,
                "color": 4437377
              }})

          }
        })
    })
  }
}

function updateEidolonSkillsStats(prompt_message, question, requestingUser, targetUser) {
  filter = m => m.author.id === requestingUser.id && (!!m.embeds.length || !!m.attachments.size || m.content.trim().toLowerCase() === "next");
  return prompt_message.channel.awaitMessages(filter, {
    max: 1,
    time: 600000,
    errors: ['time']
  })
    .then(message => {
      message = message.first();
      if (message.content.trim().toLowerCase() === "next" && !message.attachments.size) {
        return
      }
      return handleEidolonUpdateMsg(question.question_label, message, targetUser)
        .then(() => {
          return message.channel.send({embed: {
              "title": `Screenshot for ${targetUser.currentEidolon.eidolon_name} Recorded`,
              "description": `<@!${requestingUser.id}> Recorded your screenshot for this target Seeker's ${targetUser.currentEidolon.eidolon_name} skills`,
              "color": 4437377
            }})
        })

    })
    .catch(collected => {
      console.log(collected)
    });

}

function overrideCurrentGearModal(prompt_message, process, requestingUser, targetUser, gear) {
  switch (process) {
    case 'gear':
      let gear_stats_arr = [];
      gear_stats_arr.push({
        "title": `Existing ${process.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())))} Stats for ${gear.gear_type}`,
        "color": 15746887,
        "image": {
          "url": gear.gear_pic
        }
      });
      let override_embeds = [
        {
          "title": "Override Current Stats?",
          "description": `You already posted stats for your ${gear.gear_type}.  Would you like to override and update your existing stats?`,
          "color": 15746887,
          "fields": [
            {
              "name": "<:yes:708475393631584318> Override ⚠️",
              "value": "Prompts you to create new stats for this Gear Type, overriding the existing stats"
            },
            {
              "name": "<:no:752559326396153939> Keep Stats",
              "value": "Keeps the Current Stats and moves on to the next prompt"
            }
          ]
        }
      ].concat(gear_stats_arr);
      let overrideMsgArr = [];
      return Promise.map(override_embeds.slice(1), (override_embed) => {
        return prompt_message.channel.send({embed: override_embed})
          .then((resMsg) => overrideMsgArr.push(resMsg))
      })
        .then(() => {
          return prompt_message.channel.send({embed: override_embeds[0]})
            .then((overridemsg)=> {
              overrideMsgArr.push(overridemsg);
              let yesEmoji = overridemsg.author.client.emojis.cache.find(emoji => emoji.name === 'yes');
              let noEmoji = overridemsg.author.client.emojis.cache.find(emoji => emoji.name === 'no');
              return Promise.map([yesEmoji, noEmoji], function forEachEmojiReact(emoji){
                return overridemsg.react(emoji)
              })
                .then(() => {
                  let filter = (reaction, user) => user.id === requestingUser.id && (reaction.emoji === yesEmoji || reaction.emoji === noEmoji);
                  return overridemsg.awaitReactions(filter,{max: 1, time: 600000})
                    .then(function handleYesOrNo(inputReaction) {
                      inputReaction = inputReaction.first();
                      if (inputReaction.emoji.id === yesEmoji.id) {
                        return Promise.map(overrideMsgArr, msg => msg.delete())
                          .return(true)
                      }
                      return Promise.map(overrideMsgArr, msg => msg.delete())
                        .then(function handleNonOverride() {
                          return prompt_message.channel.send({embed: {
                              "title": `Override Canceled [${process}]`,
                              "color": 4437377
                            }})
                        })
                        .return(false)
                    })
                })
            })
        });
    default:
      targetUser.currentEidolon.eidolon_elixirs = JSON.stringify(!!message.attachments.size && message.attachments.array() || message.embeds);
  }


}


function overrideCurrentStatsModal(prompt_message, question, requestingUser, targetUser, ownedEidolon) {
  switch (question.question_label) {
    case 'eidolon-elixirs':
    case 'eidolon-skills':
      const eidolon_stats_str = question.question_label === 'eidolon-skills'? JSON.parse(ownedEidolon.eidolon_skills): JSON.parse(ownedEidolon.eidolon_elixirs);
      let eidolon_stats_arr = [];
      const title_stats_type = question.question_label === 'eidolon-skills'? 'Skills': 'Elixirs';
      for (let stats_embed of eidolon_stats_str) {
        eidolon_stats_arr.push({
          "title": `Existing ${title_stats_type} Stats for ${ownedEidolon.eidolon_name}`,
          "color": 15746887,
          "image": {
            "url": stats_embed.url
          }
        })
      }
      let override_embeds = [
        {
          "title": "Override Current Stats?",
          "description": `You already posted stats for your ${ownedEidolon.eidolon_name}.  Would you like to override and update your existing stats?`,
          "color": 15746887,
          "fields": [
            {
              "name": "<:yes:708475393631584318> Override ⚠️",
              "value": "Prompts you to create new stats for this Eidolon, overriding the existing stats"
            },
            {
              "name": "<:no:752559326396153939> Keep Stats",
              "value": "Keeps the Current Stats and moves on to the next prompt"
            }
          ]
        }
      ].concat(eidolon_stats_arr);
      let overrideMsgArr = [];
      return Promise.map(override_embeds.slice(1), (override_embed) => {
        return prompt_message.channel.send({embed: override_embed})
          .then((resMsg) => overrideMsgArr.push(resMsg))
      })
        .then(() => {
          return prompt_message.channel.send({embed: override_embeds[0]})
            .then((overridemsg)=> {
              overrideMsgArr.push(overridemsg);
              let yesEmoji = overridemsg.author.client.emojis.cache.find(emoji => emoji.name === 'yes');
              let noEmoji = overridemsg.author.client.emojis.cache.find(emoji => emoji.name === 'no');
              return Promise.map([yesEmoji, noEmoji], function forEachEmojiReact(emoji){
                return overridemsg.react(emoji)
              })
                .then(() => {
                  let filter = (reaction, user) => user.id === requestingUser.id && (reaction.emoji === yesEmoji || reaction.emoji === noEmoji);
                  return overridemsg.awaitReactions(filter,{max: 1, time: 600000})
                    .then(function handleYesOrNo(inputReaction) {
                      inputReaction = inputReaction.first();
                      if (inputReaction.emoji.id === yesEmoji.id) {
                        return Promise.map(overrideMsgArr, msg => msg.delete())
                          .return(true)
                      }
                      return Promise.map(overrideMsgArr, msg => msg.delete())
                        .then(function handleNonOverride() {
                          return prompt_message.channel.send({embed: {
                              "title": `Override Canceled [${question.question_label}]`,
                              "color": 4437377
                            }})
                        })
                        .return(false)
                    })
                })
            })
        });
    default:
      targetUser.currentEidolon.eidolon_elixirs = JSON.stringify(!!message.attachments.size && message.attachments.array() || message.embeds);
  }


}

function handleEidolonUpdateMsg(process, message, targetUser) {
  switch (process) {
    case 'eidolon-skills':
      targetUser.currentEidolon.eidolon_skills = JSON.stringify(!!message.attachments.size && message.attachments.array() || message.embeds);
      break;
    case 'eidolon-elixirs':
      targetUser.currentEidolon.eidolon_elixirs = JSON.stringify(!!message.attachments.size && message.attachments.array() || message.embeds);
      break;
  }

  return recordEidolonSkills(targetUser)

}


function handleEidoReactions(prompt_message, requestingUser, targetUser) {
  let filter = m => m.author.id === requestingUser.id;
  return prompt_message.channel.awaitMessages(filter,{max: 1, time: 600000})
    .then(function feedBackNext(reaction_prompt) {
      console.log(requestingUser);
      let msg_reactions = prompt_message.reactions.cache.filter(reaction => ['cucu', 'flamerider', 'earthstrider', 'oakspirit', 'spitfire', 'siren', 'junglewyvern', 'monkeyking', 'aeriola', 'ninetails', 'frostdragon', 'nezha', 'gigi', 'pokermaster'].includes(reaction.emoji.name) && reaction.users.cache.has(requestingUser.id));
      const eido_emoji_mapping = {
        "cucu": "Cucurbit",
        "flamerider": "Flame Rider",
        "earthstrider": "Earthstrider",
        "oakspirit": "Oak Spirit",
        "spitfire": "Spitfire",
        "siren": "Siren",
        "junglewyvern": "Jungle Wyvern",
        "monkeyking": "Monkey King",
        "aeriola": "Aeriola",
        "ninetails": "Nine Tails",
        "frostdragon": "Frost Dragon",
        "nezha": "Nezha",
        "gigi": "Gigi",
        "pokermaster": "Poker Master"
      };
      let potentialBuiltEmojis = [];
      for (_reaction of msg_reactions) {
        potentialBuiltEmojis.push(eido_emoji_mapping[_reaction[1].emoji.name])
      }
      if (!potentialBuiltEmojis.length) {
        return
      }
      return prompt_message.channel.send(`<@!${requestingUser.id}> You have indicated you're going to post a build for: \n${potentialBuiltEmojis.join("\n")}`)
        .then(msg => {
          targetUser.eidolonBuildWishes = potentialBuiltEmojis;
          return Promise.each(potentialBuiltEmojis, (eidolon) => {
            return getEidolonsOwned(targetUser, eidolon)
              .then((existingEidolonBuild) => !existingEidolonBuild.length && recordEidolonNameOwned(targetUser, eidolon))
          })
            .then(()=>msg.delete({timeout: 3000}))
        })
    })
}
