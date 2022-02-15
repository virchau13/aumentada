import * as Discord from "discord.js";
import { ChatCommand } from "../command/util";

export const command: ChatCommand = {
    name: "think",
    description: "Makes Aumentada think",
    options: [],
    handler: async (interaction: Discord.CommandInteraction) => {
        await interaction.deferReply();
    },
};
