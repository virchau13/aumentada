import "dotenv/config";
import * as Discord from "discord.js";
import { REST } from "@discordjs/rest";
import { register } from "./command/all";
import { log, error } from "./util";

const token = process.env.BOT_TOKEN;
if (token == null) {
    throw "no token specified";
}

const rest = new REST({ version: "9" }).setToken(token);

const client = new Discord.Client({
    intents: [
        "GUILDS",
        // "GUILD_MEMBERS", (Privileged).
        "GUILD_BANS",
        "GUILD_EMOJIS_AND_STICKERS",
        "GUILD_INTEGRATIONS",
        "GUILD_WEBHOOKS",
        "GUILD_INVITES",
        "GUILD_VOICE_STATES",
        // "GUILD_PRESENCES", (Privileged).
        "GUILD_MESSAGES",
        "GUILD_MESSAGE_REACTIONS",
        "GUILD_MESSAGE_TYPING",
        "DIRECT_MESSAGES",
        "DIRECT_MESSAGE_REACTIONS",
        "DIRECT_MESSAGE_TYPING",
    ],
});

client.on("ready", async () => {
    log("Logged in as " + client.user?.tag);
    await register(client).then(() => {
        log("Commands registered");
    });
});

client.on("error", async (err) => {
    error("Error event: " + err.toString());
});

client.on("guildCreate", async (guild) => {
    await register(client);
    log("Registered commands for new guild " + guild.id);
});

client.login(token);
