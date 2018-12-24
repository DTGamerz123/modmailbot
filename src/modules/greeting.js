const path = require('path');
const fs = require('fs');
const config = require('../config');

module.exports = bot => {
  if (! config.enableGreeting) return;

  const greetingGuilds = config.mainGuildId;

  bot.on('guildMemberAdd', (guild, member) => {
    const channel = bot.channels.get('494367469499318273');
      let memberavatar = member.user.avatarURL;
          if (!channel) return;
          let join = new Discord.RichEmbed()
          .setColor('#15f153')
          .setAuthor('Member Joined!', memberavatar)
          .addField('Name:', `${member.user.tag}`)
          .addField('User ID:', `${member.id}`)
          .addField('Member Count:', `${member.guild.memberCount}`)
          .setFooter(`${member.guild.name}`)
          .setTimestamp()

          channel.send(join);
  });
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
    const channel = bot.channels.get('494367469499318273');
      let memberavatar = member.user.avatarURL;
    if (!goodbyechannel) return;
          let left = new Discord.RichEmbed()
          .setColor('#FF0000')
          .setAuthor('Member Left!', memberavatar)
          .addField('Name:', `${member.user.tag}`)
          .addField('User ID:', `${member.id}`)
          .addField('Member Count:', `${member.guild.memberCount}`)
          .setFooter(`${member.guild.name}`)
          .setTimestamp()

          channel.send(left);
  });
