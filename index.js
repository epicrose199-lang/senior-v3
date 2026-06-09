// 1. THE CRASH PATCH (Must be at the very top)
process.on('unhandledRejection', (reason, promise) => {
    if (reason?.message?.includes("reading 'all'")) return;
    console.error('Unhandled Rejection:', reason);
});

const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const client = new Client({ 
    checkUpdate: false,
    patchVoice: true // Helps with voice stability
});
const config = require('./config.json');

// Using Railway Variables
const TOKEN = process.env.TOKEN || config.Token;
const GUILD_ID = process.env.GUILD || config.Guild;
const CHANNEL_ID = process.env.CHANNEL || config.Channel;
const OWNER_ID = process.env.OWNER_ID || config.OwnerID;

let tempLeave = false; // Tracks if the bot is in a 1-minute timeout from 5raj

client.on('ready', async () => {
    console.log(`Successfully logged in as: ${client.user.tag}`);
    joinVC();
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (tempLeave) return; // Ignore updates if currently on 5raj cooldown
    
    // Only care if it's OUR account moving
    if (oldState.member.id !== client.user.id) return;
    
    // If disconnected or moved to a different channel, join back
    if (!newState.channelId || newState.channelId !== CHANNEL_ID) {
        console.log("Detected voice state change. Rejoining target channel...");
        setTimeout(() => joinVC(), 5000); // 5 second delay to prevent spamming
    }
});

// Text Commands Listener
client.on('messageCreate', async (message) => {
    // Only execute if the message is sent by YOU (the Owner)
    if (message.author.id !== OWNER_ID) return;

    const content = message.content.trim();
    const lowerContent = content.toLowerCase();

    // 1. Conditional Leave Command (5raj)
    if (lowerContent === '5raj') {
        if (!message.guild) return;

        const ownerChannelId = message.member?.voice?.channelId;
        const botChannelId = message.guild.members.cache.get(client.user.id)?.voice?.channelId;

        // Only leave if both you and this specific alt are in the exact same Voice Channel
        if (ownerChannelId && botChannelId && ownerChannelId === botChannelId) {
            console.log(`Leaving VC for 1 minute by owner's command.`);
            tempLeave = true;

            const connection = getVoiceConnection(message.guild.id);
            if (connection) {
                connection.destroy();
            }

            // Stay out for exactly 1 minute (60,000 ms), then join back
            setTimeout(() => {
                tempLeave = false;
                console.log(`1 minute up. Rejoining target VC...`);
                joinVC();
            }, 60000);
        }
        return;
    }

    // 2. Leaderboard Commands
    if (lowerContent === 'lb chat') return message.channel.send('&lb chat');
    if (lowerContent === 'lb vc') return message.channel.send('&lb voice');
    if (lowerContent === 'lb net') return message.channel.send('&lb networth');
    if (lowerContent === 'lb xp') return message.channel.send('&lb xp');

    // 3. Simple Utilities
    if (lowerContent === 'hidi') return message.channel.send('.v hide');
    if (lowerContent === 'sd') return message.channel.send('.v lock');
    if (lowerContent === '7l') return message.channel.send('.v unlock');

    // 4. Role & Permission Management (With automatic Owner-ID Fallback)
    if (lowerContent === '7yd co' || lowerContent.startsWith('7yd co ')) {
        const target = content.substring(6).trim() || OWNER_ID;
        return message.channel.send(`.v cowner remove ${target}`);
    }
    if (lowerContent === 'perm' || lowerContent.startsWith('perm ')) {
        const target = content.substring(4).trim() || OWNER_ID;
        return message.channel.send(`.v perm ${target}`);
    }
    if (lowerContent === 'reject' || lowerContent.startsWith('reject ')) {
        const target = content.substring(6).trim() || OWNER_ID;
        return message.channel.send(`.v reject ${target}`);
    }
    if (lowerContent === 'co' || lowerContent.startsWith('co ')) {
        const target = content.substring(2).trim() || OWNER_ID;
        return message.channel.send(`.v cowner add ${target}`);
    }
    
    // 5. Letter Shortcut Commands
    if (lowerContent === 'a' || lowerContent.startsWith('a ')) {
        const target = content.substring(1).trim() || OWNER_ID;
        return message.channel.send(`a ${target}`);
    }
    if (lowerContent === 'p' || lowerContent.startsWith('p ')) {
        const target = content.substring(1).trim() || OWNER_ID;
        return message.channel.send(`p ${target}`);
    }
    if (lowerContent === 'c' || lowerContent.startsWith('c ')) {
        const target = content.substring(1).trim() || OWNER_ID;
        return message.channel.send(`c ${target}`);
    }
    if (lowerContent === 'b' || lowerContent.startsWith('b ')) {
        const target = content.substring(1).trim() || OWNER_ID;
        return message.channel.send(`b ${target}`);
    }
});

function joinVC() {
    if (tempLeave) return; // Prevent joining back if 5raj lockout is active

    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return console.error("Error: Guild ID not found. Check your Railway Variables!");
    
    const voiceChannel = guild.channels.cache.get(CHANNEL_ID);
    if (!voiceChannel) return console.error("Error: Channel ID not found. Check your Railway Variables!");

    try {
        joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: true
        });
        console.log(`Joined VC: ${voiceChannel.name} in ${guild.name}`);
    } catch (error) {
        console.error("Failed to join voice channel:", error);
    }
}

// Security Check & Login
if (!TOKEN || TOKEN === "tokenhere" || TOKEN === "") {
    console.error("ERROR: No Token found in Railway Variables!");
} else {
    client.login(TOKEN).catch(err => {
        console.error("Login Failed! Check if your Token is still valid.");
    });
}
