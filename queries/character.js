const fetch = require("node-fetch");
const {api} = require('../config.json');

const getExistingDiscordCharacterMapping = function getExistingDiscordCharacterMapping(discordID, characterID) {

  let query ='api/v1/playerStats/discordCharacterMapping';
  if (!!discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${discordID}`

  }
  if (!!characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${characterID}`
  }
  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    }
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const addDiscordCharacterMapping = function addDiscordCharacterMapping(discordID, characterID, ingameName) {
  let query ='api/v1/playerStats/discordCharacterMapping';
  return fetch(`http://${api}:5000/${query}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": discordID,
      "character_id": characterID,
      "ingame_name": ingameName || null,
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const updateProfilePic = function updateProfilePic(discordID, characterID, profilePic) {
  let query ='api/v1/playerStats/discordCharacterMapping';
  return fetch(`http://${api}:5000/${query}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": discordID,
      "character_id": characterID,
      "profile_picture": profilePic || null
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};


const recordEidolonNameOwned = function recordEidolonNameOwned(targetUser, eidolon_name) {
  return fetch(`http://${api}:5000/api/v1/playerStats/eidolons`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "eidolon_name": eidolon_name,
      "eidolon_skills": null,
      "eidolon_elixirs": null
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const recordEidolonSkills = function recordEidolonSkills(targetUser) {
  return fetch(`http://${api}:5000/api/v1/playerStats/eidolons`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "eidolon_name": targetUser.currentEidolon.eidolon_name,
      "eidolon_skills": targetUser.currentEidolon.eidolon_skills || null,
      "eidolon_elixirs": targetUser.currentEidolon.eidolon_elixirs || null
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const updateGear = function updateGear(targetUser, former_gear_pic, gear_pic, gear_type) {
  return fetch(`http://${api}:5000/api/v1/playerStats/gear`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "former_gear_pic": former_gear_pic,
      "gear_pic": gear_pic,
      "gear_type": gear_type
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};
const getSoulstones = function getGears(targetUser) {
  let query =`/api/v1/playerStats/soulstones`;
  if (!!targetUser.discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${targetUser.discordID}`
  }
  if (!!targetUser.characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${targetUser.characterID}`
  }

  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const recordSoulstonePic = function recordSoulstonePic(targetUser, soulstonePicLink) {
  return fetch(`http://${api}:5000/api/v1/playerStats/soulstones`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "soulstones_pic_link": soulstonePicLink,
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};
const getSacredBookPic = function getSacredBookPic(targetUser) {
  let query ='api/v1/playerStats/sacredbooks';
  if (!!targetUser.discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${targetUser.discordID}`

  }
  if (!!targetUser.characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${targetUser.characterID}`
  }
  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.json()
    })
    .then((question) => question)
    .catch(err => {
      console.log(err)
    });
};

const getArtifacts = function getArtifacts(targetUser) {
  let query ='api/v1/playerStats/artifacts';
  if (!!targetUser.discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${targetUser.discordID}`

  }
  if (!!targetUser.characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${targetUser.characterID}`
  }
  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.json()
    })
    .then((question) => question)
    .catch(err => {
      console.log(err)
    });
};


const getPneumaPic = function getPneumaPic(targetUser) {
  let query ='api/v1/playerStats/pneumas';
  if (!!targetUser.discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${targetUser.discordID}`

  }
  if (!!targetUser.characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${targetUser.characterID}`
  }
  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const getSageAndDemon = function getSageAndDemon(targetUser) {
  let query ='api/v1/playerStats/sageAndDemon';
  if (!!targetUser.discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${targetUser.discordID}`

  }
  if (!!targetUser.characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${targetUser.characterID}`
  }
  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const getMiragiaStore = function getMiragiaStore(targetUser) {
  let query ='api/v1/playerStats/miragiaStore';
  if (!!targetUser.discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${targetUser.discordID}`

  }
  if (!!targetUser.characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${targetUser.characterID}`
  }
  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const recordSacredBookPic = function recordSacredBookPic(targetUser, sacredBookPicLink) {
  return fetch(`http://${api}:5000/api/v1/playerStats/sacredbooks`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "sacredbooks_setup": sacredBookPicLink,
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const recordPneumaPic = function recordPneumaPic(targetUser, pneumaPicLink) {
  return fetch(`http://${api}:5000/api/v1/playerStats/pneumas`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "pneuma_setup": pneumaPicLink,
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const recordArtifacts = function recordArtifacts(targetUser, artifactPicLink) {
  return fetch(`http://${api}:5000/api/v1/playerStats/artifacts`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "artifacts": artifactPicLink,
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};


const recordSageAndDemon = function recordSageAndDemon(targetUser, sageAndDemon) {
  return fetch(`http://${api}:5000/api/v1/playerStats/sageAndDemon`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "sage_and_demon_pic": sageAndDemon,
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const recordMiragiaStore = function recordMiragiaStore(targetUser, miragiaStorePic) {
  return fetch(`http://${api}:5000/api/v1/playerStats/miragiaStore`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "miragia_store_pic": miragiaStorePic,
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};


const recordGearPic = function recordGearPic(targetUser, gearpicLink) {
  return fetch(`http://${api}:5000/api/v1/playerStats/gear`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
    body: JSON.stringify({
      "discord_id": targetUser.discordID || 0,
      "character_id": targetUser.character_id || 0,
      "gear_pic": gearpicLink,
    })
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const getGears = function getGears(targetUser, gearType) {
  let query =`/api/v1/playerStats/gear`;
  if (!!targetUser.discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${targetUser.discordID}`
  }
  if (!!targetUser.characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${targetUser.characterID}`
  }
  if (!!gearType) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}gearType=${gearType}`
  }

  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};

const getGearType = function getGearType(targetUser, gearpicLink) {
  let gear_link_encoded = encodeURIComponent(gearpicLink);
  let query =`/api/v1/playerStats/gear/type`;
  query+=`?url=${gear_link_encoded}`;

  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};



const getEidolonsOwned = function getEidolonsOwned(targetUser, eidolon) {
  let query =`/api/v1/playerStats/eidolons`;
  if (!!targetUser.discordID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}discordID=${targetUser.discordID}`
  }
  if (!!targetUser.characterID) {
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}characterID=${targetUser.characterID}`
  }
  if ((!!targetUser.currentEidolon && !!targetUser.currentEidolon.eidolon_name) || !!eidolon) {
    let eidolonName = (!!targetUser.currentEidolon && targetUser.currentEidolon.eidolon_name) || eidolon;
    eidolonName = (eidolonName.split(" ")).join("%20");
    let prefix_query = query.includes('?') ? '&' : '?';
    query+=`${prefix_query}eidolonName=${eidolonName}`
  }

  return fetch(`http://${api}:5000/${query}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      'credentials': 'same-origin'
    },
  })
    .then(response => {
      return response.text()
    })
    .then((question) => JSON.parse(question, (key, value) => {
      if (["character_id", "discord_id"].includes(key)) {
        return BigInt(value);
      }
      return value;
    }))
    .catch(err => {
      console.log(err)
    });
};


module.exports = {
  recordEidolonNameOwned,
  getExistingDiscordCharacterMapping,
  addDiscordCharacterMapping,
  getEidolonsOwned,
  recordEidolonSkills,
  recordSoulstonePic,
  getSoulstones,
  recordGearPic,
  getGearType,
  getGears,
  updateGear,
  recordSacredBookPic,
  getSacredBookPic,
  getPneumaPic,
  getMiragiaStore,
  getSageAndDemon,
  recordPneumaPic,
  recordMiragiaStore,
  recordSageAndDemon,
  updateProfilePic,
  recordArtifacts,
  getArtifacts
};