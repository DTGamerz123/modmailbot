const path = require('path');
const fs = require('fs');
const Discord = require('discord.js');
const config = require('../config');
const { Client } = require('discord.js');
const bot = new Client({ disableEveryone: true });

module.exports = bot => {
  if (! config.enableGreeting) return;

  const greetingGuilds = config.mainGuildId;

  bot.on('guildMemberAdd', (guild, member) => {
    const channela = bot.getChannel('494367469499318273');
      let memberavatar = member.user.avatarURL;
          if (!channela) return;
          let join = new Discord.RichEmbed()
          .setColor('#15f153')
          .setAuthor('Member Joined!', memberavatar)
          .addField('Name:', `${member.user.tag}`)
          .addField('User ID:', `${member.id}`)
          .addField('Member Count:', `${member.guild.memberCount}`)
          .setFooter(`${member.guild.name}`)
          .setTimestamp()

          send(join);
    
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
bot.on('guildMemberRemove', member => {
    const channelb = bot.getChannel('494367469499318273');
      let memberavatar = member.user.avatarURL;
    if (!channelb) return;
          let left = new Discord.RichEmbed()
          .setColor('#FF0000')
          .setAuthor('Member Left!', memberavatar)
          .addField('Name:', `${member.user.tag}`)
          .addField('User ID:', `${member.id}`)
          .addField('Member Count:', `${member.guild.memberCount}`)
          .setFooter(`${member.guild.name}`)
          .setTimestamp()

          send(left);
  });
