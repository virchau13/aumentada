import * as Discord from "discord.js";
import { Arg, Command, isStandaloneCmd } from "./types";
import { commands } from "./commands";
import { warn } from "../util";

function translateCommand(cmd: Command): Discord.ApplicationCommandData {
    if (isStandaloneCmd(cmd)) {
        return {
            name: cmd.name,
            description: cmd.desc,
            options: cmd.args.map((arg) => ({
                type: arg.type,
                name: arg.name,
                description: arg.desc,
                required: arg.required ?? true,
            })),
            defaultPermission: cmd.defaultPermission ?? true,
        };
    } else {
        // is command group
        return {
            name: cmd.name,
            description: cmd.desc,
            options: cmd.sub.map((c) =>
                Object.assign(translateCommand(c), {
                    type: isStandaloneCmd(c)
                        ? ("SUB_COMMAND" as const)
                        : ("SUB_COMMAND_GROUP" as const),
                })
            ),
        };
    }
}

function findCmd(cmds: Command[], name: string): Command | undefined {
    return cmds.find((x) => x.name === name);
}

type DiscordOptionMap = Discord.Collection<
    string,
    Discord.CommandInteractionOption
>;

class InvalidCommand extends Error {}
class MissingCmdArg extends Error {}

function parseArgs(args: Arg[], options: DiscordOptionMap | undefined): any[] {
    return args.map((arg) => {
        let opt = options?.get(arg.name);
        if (opt) {
            return opt.value;
        } else {
            throw new MissingCmdArg();
        }
    });
}

async function handleCmdInvoke(
    cmd: Command,
    interaction: Discord.CommandInteraction,
    options: DiscordOptionMap | undefined
) {
    if (isStandaloneCmd(cmd)) {
        let args = parseArgs(cmd.args, options);
        await cmd.func(interaction, args);
    } else {
        // is a group command
        let chosen = options?.first();
        let nextCmd;
        if (chosen && (nextCmd = findCmd(cmd.sub, chosen.name))) {
            handleCmdInvoke(nextCmd, interaction, chosen.options);
        } else {
            throw new InvalidCommand(chosen?.name);
        }
    }
}

/**
 * Should only be called after `"ready"` has occured.
 */
export async function registerCmds(client: Discord.Client) {
    // TODO change this to global
    await Promise.all(
        client.guilds.cache.array().map(async (guild) => {
            await guild.commands.set(
                commands.map((cmd) => translateCommand(cmd))
            );
        })
    );
    let cmdMap: { [key: string]: Command } = {};
    for (let command of commands) {
        cmdMap[command.name] = command;
    }
    client.on("interactionCreate", async (interaction) => {
        if (interaction.isCommand()) {
            let cmd = findCmd(commands, interaction.commandName);
            if (cmd) {
                try {
                    await handleCmdInvoke(
                        cmd,
                        interaction,
                        interaction.options
                    );
                } catch (e) {
                    warn(
                        "Invalid subcommand of `" +
                            interaction.commandName +
                            "`: `" +
                            e.toString() +
                            "`, ignoring"
                    );
                }
            } else {
                warn(
                    "Invalid command `" +
                        interaction.commandName +
                        "` invoked, ignoring"
                );
            }
        }
    });
}
