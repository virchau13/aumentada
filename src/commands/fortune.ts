import * as Discord from "discord.js";
import { ChatCommand, MAX_MSG_LEN, putCodeInBlock } from "../command/util";
import * as util from "util";
import { execFile as rawExecFile } from "child_process";
const execFile = util.promisify(rawExecFile);

export const command: ChatCommand = {
    name: "fortune",
    description: "Produces a random tidbit",
    options: [],
    handler: async (interaction: Discord.CommandInteraction) => {
        await interaction.deferReply();
        let reply;
        do {
            // TODO nixify
            const { stdout } = await execFile("fortune", []);
            reply = putCodeInBlock(stdout);
        } while (reply.length > MAX_MSG_LEN);
        await interaction.editReply(reply);
    },
};
