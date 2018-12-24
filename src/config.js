const json5 = require('json5');
const fs = require('fs');
const path = require('path');

let userConfig;

// Try to find our config file from several options
const configFiles = [
  'config.json',
  'config.json5',
  'config.json.json',
  'config.json.txt',
  'config.js'
];

let foundConfigFile;

for (const configFile of configFiles) {
  try {
    fs.accessSync(__dirname + '/../' + configFile);
    foundConfigFile = configFile;
    break;
  } catch (e) {}
}

if (! foundConfigFile) {
  throw new Error(`Could not find config.json!`);
}

// Parse the config using JSON5
try {
  if (foundConfigFile.endsWith('.js')) {
    userConfig = require(`../${foundConfigFile}`);
  } else {
    const raw = fs.readFileSync(__dirname + '/../' + foundConfigFile);
    userConfig = json5.parse(raw);
  }
} catch (e) {
  throw new Error(`Error reading config file! The error given was: ${e.message}`);
}

const defaultConfig = {
  "token": process.env.TOKEN,
  "mailGuildId": "489721243935703042",
  "mainGuildId": "475149234014912512",
  "logChannelId": "494239155841138689",

  "prefix": "!",
  "snippetPrefix": "!!",

  "status": "Message me for help!",
  "responseMessage": "Thank you for your message! The staff team will reply to you as soon as possible!",
  "closeMessage": "Thank you for contacting our staff team! This thread is now marked as closed. If you have any other query you can message me again!",

  "newThreadCategoryId": "499499287181262859",
  "mentionRole": "here",
  "pingOnBotMention": true,

  "inboxServerPermission": null,
  "alwaysReply": true,
  "alwaysReplyAnon": false,
  "useNicknames": false,
  "ignoreAccidentalThreads": true,
  "threadTimestamps": false,
  "allowMove": true,
  "typingProxy": true,
  "typingProxyReverse": true,

  "enableGreeting": true,
  "greetingMessage": "Hello I am DaveBot,\nWelcome to our server **CroBy™**.\nMake sure you read <#494367096470503435>, before doing other stuffs!\nIf you need help you can Message me to contact Staffs!",
  "greetingAttachment": "https://cdn.discordapp.com/attachments/494413211962048513/526650887674789898/1_KAeS9Sm-OsHP29g_0kYKJQ-crop.png",

  "requiredAccountAge": "24", // In hours
  "accountAgeDeniedMessage": "Your Discord account is not old enough to contact our staff team through DaveBot!",


  "relaySmallAttachmentsAsAttachments": false,
  "smallAttachmentLimit": 1024 * 1024 * 2,

  "port": 8890,
  "url": null,

  "dbDir": path.join(__dirname, '..', 'db'),
  "knex": null,

  "logDir": path.join(__dirname, '..', 'logs'),
};

const required = ['token', 'mailGuildId', 'mainGuildId', 'logChannelId'];

const finalConfig = Object.assign({}, defaultConfig);

for (const [prop, value] of Object.entries(userConfig)) {
  if (! defaultConfig.hasOwnProperty(prop)) {
    throw new Error(`Invalid option: ${prop}`);
  }

  finalConfig[prop] = value;
}

// Default knex config
if (! finalConfig['knex']) {
  finalConfig['knex'] = {
    client: 'sqlite',
      connection: {
      filename: path.join(finalConfig.dbDir, 'data.sqlite')
    },
    useNullAsDefault: true
  };
}

// Make sure migration settings are always present in knex config
Object.assign(finalConfig['knex'], {
  migrations: {
    directory: path.join(finalConfig.dbDir, 'migrations')
  }
});

// Make sure all of the required config options are present
for (const opt of required) {
  if (! finalConfig[opt]) {
    console.error(`Missing required config.json value: ${opt}`);
    process.exit(1);
  }
}

if (finalConfig.smallAttachmentLimit > 1024 * 1024 * 8) {
  finalConfig.smallAttachmentLimit = 1024 * 1024 * 8;
  console.log('[WARN] smallAttachmentLimit capped at 8MB');
}

// Make sure mainGuildId is internally always an array
if (! Array.isArray(finalConfig['mainGuildId'])) {
  finalConfig['mainGuildId'] = [finalConfig['mainGuildId']];
}

module.exports = finalConfig;
