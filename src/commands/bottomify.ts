import { ChatCommand, MAX_MSG_LEN } from "../command/util";
import { bottomify, unbottomify } from "../lib";

export const command: ChatCommand = {
    name: "bottomify",
    description: "Allows one to speak to bottoms",
    options: [
        {
            name: "speak",
            description: "Speak to bottoms",
            type: "SUB_COMMAND",
            options: [
                {
                    type: "STRING",
                    name: "phrase",
                    description: "The thing to speak to bottoms about",
                },
            ],
            handler: async (interaction, [phrase]: [string]) => {
                let res = '"' + bottomify(phrase) + '"';
                if (res.length > MAX_MSG_LEN) {
                    interaction.reply(
                        "Sorry, your message is too long for a bottom to comprehend"
                    );
                } else {
                    interaction.reply(res);
                }
            },
        },
        {
            name: "listen",
            type: "SUB_COMMAND",
            description: "Listen to bottoms",
            options: [
                {
                    type: "STRING",
                    name: "phrase",
                    description: "The thing that bottoms told you",
                },
            ],
            handler: async (interaction, [phrase]: [string]) => {
                let res = unbottomify(phrase.replace(/"/gm, ''));
                if ("result" in res) {
                    interaction.reply('"' + res.result + '"');
                } else {
                    interaction.reply(
                        `Couldn't translate: ${res.error}\nAre you sure you're speaking to a real bottom?`
                    );
                }
            },
        },
    ],
};
