import * as Discord from "discord.js";

export const MAX_MSG_LEN = 2000;

/** Sanitizes the code put in,
 * so it fits in a Discord code block.
 */
export function putCodeInBlock(code: string): string {
    return "```" + code.replace(/`/gm, "`\u200b") + "```";
}

export function msToTime(duration: number): string {
    let seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor(duration / (1000 * 60 * 60));
    return (
        hours.toString() +
        "h" +
        (minutes < 10 ? "0" + minutes : minutes.toString()) +
        "m" +
        (seconds < 10 ? "0" + seconds : seconds.toString()) +
        "s"
    );
}

export type CommandHandler = (
    it: Discord.CommandInteraction,
    args: any
) => Promise<unknown>;

export type ChatCommand = Omit<
    Discord.ChatInputApplicationCommandData,
    "options"
> & {
    options: Array<CommandOption>;
    handler?: CommandHandler;
};

export type SubCommand = (Omit<Discord.ApplicationCommandSubCommandData, 'options'> & {
    options: Exclude<Exclude<Discord.ApplicationCommandSubCommandData['options'], undefined>[0], Discord.ApplicationCommandNonOptionsData>[];
    handler: CommandHandler;
})


export type CommandOption =
    | SubCommand
    | Exclude<
          Exclude<
              Discord.ApplicationCommandOptionData,
              Discord.ApplicationCommandSubCommandData
          >,
          Discord.ApplicationCommandNonOptionsData
      >;

export function commandToDiscordCommand(
    cmd: ChatCommand
): Discord.ApplicationCommandData {
    const { handler, options, ...rest } = cmd;
    return { options: options.map(o => commandOptionToDiscordCommandOption(o)), ...rest };
}

export function commandOptionToDiscordCommandOption(
    opt: CommandOption
): Discord.ApplicationCommandOptionData {
    if ("handler" in opt) {
        const { handler, ...rest } = opt;
        return rest;
    } else {
        return opt;
    }
}
