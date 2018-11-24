const Eris = require('eris');
const config = require('./config');
const bott = new Discord.Client({disableEveryone: true});

bott.on('guildMemberAdd', member => {
      let channel = member.guild.channels.find('name', 'joins-leaves');
      let memberavatar = member.user.avatarURL;
          if (!channel) return;
          let join = new Discord.RichEmbed()
          .setColor('#15f153')
          .setThumbnail(memberavatar)
          .addField(':bust_in_silhouette: | Member Joined!', `${member}`)
          .addField(':microphone2: | Welcome!', `Welcome To The Server, ${member}`)
          .addField(':id: | User :', "**[" + `${member.id}` + "]**")
          .addField(':family_mwgb: | Your Are The Member', `${member.guild.memberCount}`)
          .addField("Name", `${member.user.tag}`, true)
          .addField('Server', `${member.guild.name}`, true )
          .setFooter(`${member.guild.name}`)
          .setTimestamp()

          channel.send(join);
  });
//join-left
  bott.on('guildMemberRemove', member => {
    const goodbyechannel = member.guild.channels.find('name', 'joins-leaves')
      let memberavatar = member.user.avatarURL;
    if (!goodbyechannel) return;
          let left = new Discord.RichEmbed()
          .setColor('#FF0000')
          .setThumbnail(memberavatar)
          .addField('Member Left!', `${member.user.tag}`)
          .addField('Has Left the Server', 'Hope He/She Come Back Soon!')
          .addField('Bye Bye :(', 'We All Will Miss You!')
          .addField('The Server Now Has', `${member.guild.memberCount}` + " Members")
          .setFooter(`${member.guild.name}`)
          .setTimestamp()

          goodbyechannel.send(left);
  });
const bot = new Eris.CommandClient(config.token, {}, {
  prefix: config.prefix,
  ignoreSelf: true,
  ignoreBots: true,
  defaultHelpCommand: false,
  getAllUsers: true,
  defaultCommandOptions: {
    caseInsensitive: true,
  },
});

module.exports = bot;
