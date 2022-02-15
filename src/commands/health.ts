import * as Discord from "discord.js";
import { ChatCommand, msToTime } from "../command/util";
import * as os from "os";

const botDescription =
    "Available for trade (acausal or otherwise) 24/7/365/230M.";

export const command: ChatCommand = {
    name: "health",
    description: "Checks Aumentada's health",
    options: [],
    handler: async (interaction) => {
        let latencyMs = Date.now() - interaction.createdTimestamp;
        let wsPingMs = interaction.client.ws.ping;
        let totalMemBytes = os.totalmem();
        let guildCount = interaction.client.guilds.cache.size;
        let uptimeMs = interaction.client.uptime;
        let shard = interaction.client.shard;
        let shards = interaction.client.ws.shards.size;
        let {
            maxRSS: memUsageKB,
            userCPUTime,
            systemCPUTime,
        } = process.resourceUsage();
        let embed = new Discord.MessageEmbed()
            .setColor("#55ddff")
            .setTitle("Aumentada")
            .setDescription(botDescription)
            .addFields(
                {
                    name: "Latency",
                    value: latencyMs.toString() + "ms",
                    inline: true,
                },
                {
                    name: "WebSocket ping",
                    value: wsPingMs.toString() + "ms",
                    inline: true,
                },
                {
                    name: "Used memory",
                    value: Math.round(memUsageKB / 1024).toString() + "MB",
                    inline: true,
                },
                {
                    name: "Total memory",
                    value:
                        Math.round(totalMemBytes / (1024 * 1024)).toString() +
                        "MB",
                    inline: true,
                },
                {
                    name: "CPU time",
                    value:
                        "User " +
                        userCPUTime +
                        "μs, System " +
                        systemCPUTime +
                        "μs",
                    inline: true,
                },
                {
                    name: "Guilds",
                    value: guildCount.toString(),
                    inline: true,
                },
                {
                    name: "Uptime",
                    value: uptimeMs ? msToTime(uptimeMs) : "lmao idk",
                    inline: true,
                },
                {
                    name: "Shard",
                    value: shard?.toString() ?? "0",
                    inline: true,
                },
                { name: "Shards", value: shards.toString(), inline: true }
            )
            .setTimestamp();
        const avatarURL = interaction.client.user?.avatarURL();
        if (avatarURL) {
            embed = embed.setThumbnail(avatarURL);
        }
        interaction.reply({
            content: " ",
            embeds: [embed],
        });
    },
};
