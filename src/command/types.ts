import * as Discord from "discord.js";

export function isStandaloneCmd(cmd: Command): cmd is StandaloneCmd {
    return "func" in cmd;
}

export type Command = StandaloneCmd | SubCmdGroup;

type SubCmdGroup = {
    sub: Command[];
} & NameDesc;

type StandaloneCmd = {
    args: Arg[];
    defaultPermission?: boolean;
    func: (interaction: Discord.CommandInteraction, args: any) => Promise<void>;
} & NameDesc;

export type Arg = {
    type: ArgTypeName;
    required?: boolean;
} & NameDesc;

type ArgTypeName = Discord.ApplicationCommandOptionType;

type NameDesc = {
    name: string;
    desc: string;
};
