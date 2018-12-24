const Eris = require('eris');

const config = require('./config');
const bot = require('./bot');
const Queue = require('./queue');
const utils = require('./utils');
const blocked = require('./data/blocked');
const threads = require('./data/threads');

const reply = require('./modules/reply');
const close = require('./modules/close');
const snippets = require('./modules/snippets');
const logs = require('./modules/logs');
const move = require('./modules/move');
const block = require('./modules/block');
const suspend = require('./modules/suspend');
const webserver = require('./modules/webserver');
const greeting = require('./modules/greeting');
const typingProxy = require('./modules/typingProxy');
const version = require('./modules/version');
const newthread = require('./modules/newthread');
const idModule = require('./modules/id');
const alert = require('./modules/alert');

const attachments = require("./data/attachments");
const {ACCIDENTAL_THREAD_MESSAGES} = require('./data/constants');

const messageQueue = new Queue();

// Once the bot has connected, set the status/"playing" message
bot.on('ready', () => {
  bot.editStatus(null, {name: config.status});
  console.log('Connected! Now listening to DMs.');
});

/**
 * When a moderator posts in a modmail thread...
 * 1) If alwaysReply is enabled, reply to the user
 * 2) If alwaysReply is disabled, save that message as a chat message in the thread
 */
bot.on('messageCreate', async msg => {
  if (! utils.messageIsOnInboxServer(msg)) return;
  if (msg.author.bot) return;

  const thread = await threads.findByChannelId(msg.channel.id);
  if (! thread) return;

  if (msg.content.startsWith(config.prefix) || msg.content.startsWith(config.snippetPrefix)) {
    // Save commands as "command messages"
    if (msg.content.startsWith(config.snippetPrefix)) return; // Ignore snippets
    thread.saveCommandMessage(msg);
  } else if (config.alwaysReply) {
    // AUTO-REPLY: If config.alwaysReply is enabled, send all chat messages in thread channels as replies
    if (! utils.isStaff(msg.member)) return; // Only staff are allowed to reply

    if (msg.attachments.length) await attachments.saveAttachmentsInMessage(msg);
    await thread.replyToUser(msg.member, msg.content.trim(), msg.attachments, config.alwaysReplyAnon || false);
    msg.delete();
  } else {
    // Otherwise just save the messages as "chat" in the logs
    thread.saveChatMessage(msg);
  }
});

/**
 * When we get a private message...
 * 1) Find the open modmail thread for this user, or create a new one
 * 2) Post the message as a user reply in the thread
 */

bot.on('messageCreate', async msg => {
  if (! (msg.channel instanceof Eris.PrivateChannel)) return;
  if (msg.author.bot) return;
  if (msg.type !== 0) return; // Ignore pins etc.

  if (await blocked.isBlocked(msg.author.id)) return;

  // Private message handling is queued so e.g. multiple message in quick succession don't result in multiple channels being created
  messageQueue.add(async () => {
    let thread = await threads.findOpenThreadByUserId(msg.author.id);

    // New thread
    if (! thread) {
      // Ignore messages that shouldn't usually open new threads, such as "ok", "thanks", etc.
      if (config.ignoreAccidentalThreads && msg.content && ACCIDENTAL_THREAD_MESSAGES.includes(msg.content.trim().toLowerCase())) return;

      thread = await threads.createNewThreadForUser(msg.author);
    }

    if (thread) await thread.receiveUserReply(msg);
  });
});

/**
 * When a message is edited...
 * 1) If that message was in DMs, and we have a thread open with that user, post the edit as a system message in the thread
 * 2) If that message was moderator chatter in the thread, update the corresponding chat message in the DB
 */
bot.on('messageUpdate', async (msg, oldMessage) => {
  if (! msg || ! msg.author) return;
  if (msg.author.bot) return;
  if (await blocked.isBlocked(msg.author.id)) return;

  // Old message content doesn't persist between bot restarts
  const oldContent = oldMessage && oldMessage.content || '*Unavailable due to bot restart*';
  const newContent = msg.content;

  // Ignore bogus edit events with no changes
  if (newContent.trim() === oldContent.trim()) return;

  // 1) Edit in DMs
  if (msg.channel instanceof Eris.PrivateChannel) {
    const thread = await threads.findOpenThreadByUserId(msg.author.id);
    if (! thread) return;
    
    const editMessage = utils.disableLinkPreviews(`**The user edited their message:**\n\`B:\` ${oldContent}\n\`A:\` ${newContent}`);
    thread.postSystemMessage(editMessage);
  }

  // 2) Edit in the thread
  else if (utils.messageIsOnInboxServer(msg) && utils.isStaff(msg.member)) {
    const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
    if (! thread) return;

    thread.updateChatMessage(msg);
  }
});

/**
 * When a staff message is deleted in a modmail thread, delete it from the database as well
 */
bot.on('messageDelete', async msg => {
  if (! msg.author) return;
  if (msg.author.bot) return;
  if (! utils.messageIsOnInboxServer(msg)) return;
  if (! utils.isStaff(msg.member)) return;

  const thread = await threads.findOpenThreadByChannelId(msg.channel.id);
  if (! thread) return;

  thread.deleteChatMessage(msg.id);
});

/**
 * When the bot is mentioned on the main server, ping staff in the log channel about it
 */
bot.on('messageCreate', async msg => {
  if (! utils.messageIsOnMainServer(msg)) return;
  if (! msg.mentions.some(user => user.id === bot.user.id)) return;
  if (msg.author.bot) return;

  // If the person who mentioned the modmail bot is also on the modmail server, ignore them
  if (utils.getInboxGuild().members.get(msg.author.id)) return;

  // If the person who mentioned the bot is blocked, ignore them
  if (await blocked.isBlocked(msg.author.id)) return;

  let content;
  const mainGuilds = utils.getMainGuilds();
  const staffMention = (config.pingOnBotMention ? utils.getInboxMention() : '');

  if (mainGuilds.length === 1) {
    content = `${staffMention}Bot mentioned in ${msg.channel.mention} by **${msg.author.username}#${msg.author.discriminator}**: "${msg.cleanContent}"`;
  } else {
    content = `${staffMention}Bot mentioned in ${msg.channel.mention} (${msg.channel.guild.name}) by **${msg.author.username}#${msg.author.discriminator}**: "${msg.cleanContent}"`;
  }

  bot.createMessage(utils.getLogChannel(bot).id, {
    content,
    disableEveryone: false,
  });
});

module.exports = {
  async start() {
    // Load modules
    console.log('Loading modules...');
    await reply(bot);
    await close(bot);
    await logs(bot);
    await block(bot);
    await move(bot);
    await snippets(bot);
    await suspend(bot);
    await greeting(bot);
    await webserver(bot);
    await typingProxy(bot);
    await version(bot);
    await newthread(bot);
    await idModule(bot);
    await alert(bot);

    // Connect to Discord
    console.log('Connecting to Discord...');
    await bot.connect();
  }
};
const authors = [];
var warned = [];
var banned = [];
var messagelog = [];

/**
 * Add simple spam protection to your discord server.
 * @param  {Bot} bot - The discord.js CLient/bot
 * @param  {object} options - Optional (Custom configuarion options)
 * @return {[type]}         [description]
 */
module.exports = function (bot, options) {
  // Set options
  const warnBuffer = (options && options.warnBuffer) || 3;
  const maxBuffer = (options && options.maxBuffer) || 5;
  const interval = (options && options.interval) || 1000;
  const warningMessage = (options && options.warningMessage) || "stop spamming or I'll whack your head off.";
  const banMessage = (options && options.banMessage) || "has been banned for spamming, anyone else?";
  const maxDuplicatesWarning = (options && options. maxDuplicatesWarning || 7);
  const maxDuplicatesBan = (options && options. maxDuplicatesBan || 10);
  const deleteMessagesAfterBanForPastDays = (options && options.deleteMessagesAfterBanForPastDays || 7);
  const exemptRoles = (options && options.exemptRoles) || []
  const exemptUsers = (options && options.exemptUsers) || []

  bot.on("message", msg => {

    // bots don't ban do they?
    if (msg.author.bot) return;

    // Return immediately if user is exempt
    if(msg.member && msg.member.roles.some(r => exemptRoles.includes(r.name))) return;
    if(exemptUsers.includes(msg.author.tag)) return;

    if ( (msg.author.id != bot.user.id) && msg.channel.guild) {
      var now = Math.floor(Date.now());
      authors.push({
        "time": now,
        "author": msg.author.id
      });
      messagelog.push({
        "message": msg.content,
        "author": msg.author.id
      });

      // Check how many times the same message has been sent.
      var msgMatch = 0;
      for (var i = 0; i < messagelog.length; i++) {
        if (messagelog[i].message == msg.content && (messagelog[i].author == msg.author.id) && (msg.author.id !== bot.user.id)) {
          msgMatch++;
        }
      }
      // Check matched count
      if (msgMatch == maxDuplicatesWarning && !warned.includes(msg.author.id)) {
        warn(msg, msg.author.id);
      }
      if (msgMatch == maxDuplicatesBan && !banned.includes(msg.author.id)) {
        ban(msg, msg.author.id);
      }

      var matched = 0;

      for (var i = 0; i < authors.length; i++) {
        if (authors[i].time > now - interval) {
          matched++;
          if (matched == warnBuffer && !warned.includes(msg.author.id)) {
            warn(msg, msg.author.id);
          }
          else if (matched == maxBuffer) {
            if (!banned.includes(msg.author.id)) {
              ban(msg, msg.author.id);
            }
          }
        }
        else if (authors[i].time < now - interval) {
          authors.splice(i);
          warned.splice(warned.indexOf(authors[i]));
          banned.splice(warned.indexOf(authors[i]));
        }
        if (messagelog.length >= 200) {
          messagelog.shift();
        }
      }
    }
  });

  /**
   * Warn a user
   * @param  {Object} msg
   * @param  {string} userid userid
   */
  function warn(msg, userid) {
    warned.push(msg.author.id);
    msg.channel.send(msg.author + " " + warningMessage);
  }

  /**
   * Ban a user by the user id
   * @param  {Object} msg
   * @param  {string} userid userid
   * @return {boolean} True or False
   */
  function ban(msg, userid) {
    for (var i = 0; i < messagelog.length; i++) {
      if (messagelog[i].author == msg.author.id) {
        messagelog.splice(i);
      }
    }

    banned.push(msg.author.id);

    var user = msg.channel.guild.members.find(member => member.user.id === msg.author.id);
    if (user) {
      user.ban(deleteMessagesAfterBanForPastDays).then((member) => {
        msg.channel.send(msg.author + " " +banMessage);
        return true;
     }).catch(() => {
        msg.channel.send("insufficient permission to kick " + msg.author + " for spamming.");
        return false;
     });
    }
  }

}
