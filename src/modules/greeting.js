const path = require('path');
const fs = require('fs');
const Discord = require('discord.js');
const config = require('../config');
const { Client } = require('discord.js');
const bot = new Client({ disableEveryone: true });

module.exports = bot => {
  if (! config.enableGreeting) return;

  const greetingGuilds = config.mainGuildId;
    
    if (! greetingGuilds.includes(guild.id)) return;

    function sendGreeting(file) {
      bot.getDMChannel(member.id).then(channel => {
        if (! channel) return;

        channel.createMessage(config.greetingMessage || '', file)
          .catch(e => {
            if (e.code === 50007) return;
            throw e;
          });
      });
    }

    if (config.greetingAttachment) {
      const filename = path.basename(config.greetingAttachment);
      fs.readFile(config.greetingAttachment, (err, data) => {
        const file = {file: data, name: filename};
        sendGreeting(file);
      });
    } else {
      sendGreeting();
    }
  });
};
