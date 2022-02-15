import * as Discord from "discord.js";
import {
    ChatCommand,
    CommandHandler,
    CommandOption,
    commandToDiscordCommand,
} from "./util";
import { warn } from "../util";

let commandNames = ["exec", "bottomify", "fortune", "health", "roll", "think"];

type CommandImport = { command: ChatCommand };

type Arr<T> = ReadonlyArray<T> | Array<T>;

function validateCommand(cmd: ChatCommand): boolean {
    let should_have_handler = true;
    for (const opt of cmd.options) {
        if (opt.type === "SUB_COMMAND" || opt.type === "SUB_COMMAND_GROUP") {
            should_have_handler = false;
            break;
        }
    }
    return "handler" in cmd === should_have_handler;
}

class InvalidCmdArg extends Error {}

function parseArgs(
    params: CommandOption[],
    args: Arr<Discord.CommandInteractionOption>
): any[] {
    return params.map((param, i) => {
        let arg = args[i];
        if (param.type === arg.type && param.name === arg.name) {
            return arg.value;
        } else {
            throw new InvalidCmdArg();
        }
    });
}

function findCmd(
    cmds: CommandOption[],
    name: string
): CommandOption | undefined {
    return cmds.find((x) => x.name === name);
}

function chatCommandIsGroup(cmd: ChatCommand): boolean {
    for (const opt of cmd.options) {
        if (opt.type === "SUB_COMMAND" || opt.type === "SUB_COMMAND_GROUP")
            return true;
    }
    return false;
}

async function invokeHandleErrors(
    handler: CommandHandler,
    it: Discord.CommandInteraction,
    args: any
) {
    try {
        await handler(it, args);
    } catch (e: any) {
        let ident = Math.random().toString(16).slice(2);
        warn(
            `[${ident}] Command ${JSON.stringify([
                it.commandName,
                ...it.options.data.map((x) => x.value),
            ])} failed with error:\n' ${e.stack}`
        );
        await it.followUp(
            `An internal error occurred. How did you achieve that? You may want to report it. (error identifier code: ${ident})`
        );
    }
}

function assertOrThrow<E>(val: boolean, err: { new(): E }): asserts val {
    if(!val) {
        throw new err();
    }
}

async function handleCmdInvoke(
    cmd: ChatCommand,
    it: Discord.CommandInteraction
) {
    if (!chatCommandIsGroup(cmd)) {
        // Standalone command
        let jsArgs = parseArgs(cmd.options, it.options.data);
        await invokeHandleErrors(cmd.handler!, it, jsArgs);
        return;
    }
    // A command with SUB_COMMANDs or SUB_COMMAND_GROUPs in it
    let opts = it.options.data;
    let sub = findCmd(cmd.options, opts[0].name);
    assertOrThrow(sub != null, InvalidCmdArg);
    opts = opts[0].options ?? [];
    while (sub.type === 'SUB_COMMAND_GROUP') {
        sub = findCmd(cmd.options, opts[0].name);
        assertOrThrow(sub != null, InvalidCmdArg);
        opts = opts[0].options ?? [];
    }
    assertOrThrow(sub.type === 'SUB_COMMAND', InvalidCmdArg);
    let jsArgs = parseArgs(sub.options, opts);
    await invokeHandleErrors(sub.handler, it, jsArgs);
}

export async function register(client: Discord.Client) {
    let commands = await Promise.all(
        commandNames
            .map((c) => "../commands/" + c)
            .map(async (path) => {
                let { command }: CommandImport = await import(path);
                if (!validateCommand(command))
                    throw `invalid command at ${path} lah`;
                return command;
            })
    );
    let discordCommands = commands.map((cmd) => commandToDiscordCommand(cmd));
    // TODO change this to global
    await Promise.all(
        client.guilds.cache.map(async (guild) => {
            await guild.commands.set(discordCommands);
        })
    );
    let cmdMap: { [key: string]: ChatCommand } = {};
    for (let cmd of commands) {
        cmdMap[cmd.name] = cmd;
    }
    client.on('interactionCreate', async interaction => {
        if (interaction.isCommand()) {
            let cmd = cmdMap[interaction.commandName]
            if(cmd) {
                try {
                    await handleCmdInvoke(
                        cmd,
                        interaction,
                    );
                } catch (e: any) {
                    warn(
                        "Invalid subcommand of `" +
                            interaction.commandName +
                            "`: `" +
                            e.toString() +
                            "`, ignoring\n"
                            + e.stack
                    );
                }
            } else {
                warn("Invalid command `" + interaction.commandName + "` invoked, ignoring");
            }
        }
    });
}
