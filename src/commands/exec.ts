import { ChatCommand, MAX_MSG_LEN, putCodeInBlock } from "../command/util";

export const command: ChatCommand = {
    name: "exec",
    type: "CHAT_INPUT",
    description: "Executes JS code",
    options: [
        {
            type: "STRING",
            name: "code",
            description: "code",
            required: true,
        },
    ],
    handler: async (interaction, [code]: [string]) => {
        if (interaction.user.id === "205898019839803392") {
            // We're probably going to need to wait a bit.
            await interaction.deferReply({ ephemeral: true });
            const logs: {
                logged: string[];
                rotated: boolean;
                terminated: boolean;
                construct(): string;
                push(l: string): void;
            } = {
                logged: [],
                rotated: false,
                terminated: false,
                construct() {
                    const constructRaw = () =>
                        this.logged.map((l) => putCodeInBlock(l)).join("");
                    const ROTATED = "Logs too long, rotating...";
                    const TERMINATED = "Execution terminated";
                    const getMaxRawLen = () =>
                        MAX_MSG_LEN -
                        (this.rotated ? ROTATED.length : 0) -
                        (this.terminated ? TERMINATED.length : 0);
                    let raw = constructRaw();
                    if (raw.length > getMaxRawLen()) {
                        // Try to preserve the last part.
                        this.rotated = true;
                        while ((raw = constructRaw()).length > getMaxRawLen()) {
                            this.logged = this.logged.slice(1);
                        }
                    }
                    if (this.rotated) raw = ROTATED + raw;
                    if (this.terminated) raw += TERMINATED;
                    return raw;
                },
                push(l: string) {
                    this.logged.push(l);
                },
            };
            const AsyncFunction = Object.getPrototypeOf(
                async function () {}
            ).constructor;
            let log = async (s: any) => {
                logs.push(s.toString());
                await interaction.editReply(logs.construct());
            };
            let send = async (s: any) => {
                let str = s.toString();
                if (str.length <= MAX_MSG_LEN) {
                    await interaction.channel?.send(str);
                } else {
                    const INFO = "...";
                    await interaction.channel?.send(
                        str.slice(0, MAX_MSG_LEN - INFO.length) + INFO
                    );
                }
            };
            try {
                let f = new AsyncFunction("it", "log", "send", code);
                await f(interaction, log, send);
                logs.terminated = true;
                await interaction.editReply(logs.construct());
            } catch (e: any) {
                console.log("oh hey, it actually got here for once");
                console.log("interaction", interaction);
                await interaction.editReply(
                    "Error! " + putCodeInBlock(e.toString())
                );
            }
        } else {
            await interaction.reply("No perms for you! :D");
        }
    },
};
