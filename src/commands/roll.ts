import { ChatCommand, MAX_MSG_LEN } from "../command/util";
import { evalDice } from "../lib";

export const command: ChatCommand = {
    name: "roll",
    description: "Evaluates a dice expression",
    options: [
        {
            type: "STRING",
            name: "expr",
            description: "The expression to evaluate",
        },
    ],
    handler: async (interaction, [expr]: [string]) => {
        let res = evalDice(expr);
        if ("result" in res) {
            let msg = `\`${expr}\` resulted in ${res.result}: `;
            let rest = res.rolls.map(roll => `${roll[0]} => ${JSON.stringify(roll[1])}`).join(', ');
            if(msg.length + rest.length > MAX_MSG_LEN) {
                msg += '(The exact rolls exceed the message limit)';
            } else {
                msg += rest;
            }
            interaction.reply(msg);
        } else {
            interaction.reply('Invalid expression: ' + res.error);
        }
    }
};
