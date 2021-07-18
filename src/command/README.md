# What is even _happening_ in these files?

Here is the entire reason why this folder exists: to make it super convenient to throw together a new command.

# Okay, but...

No, it's really easy, trust me. This is what a new command looks like:

```ts
let money = cmd.group({
    // This is the command `/money`.
    name: "money",
    desc: "All money-related commands",
    // Specifies the sub-commands of this one.
    sub: [
        cmd.single({
            name: "spend",
            desc: "Spend money",
            args: [
                {
                    name: "amount",
                    desc: "Amount of money to spend",
                    type: "INTEGER",
                },
                {
                    name: "thing",
                    desc: "What you're spending money on",
                    type: "STRING",
                    required: false, // Optional field, default `true`.
                },
            ],
            func: async ([amount, thing]: [number, string?]) => {
                // Do whatever you want in here!
                // Returns a `Promise<void>`.
            },
        }),
        cmd({
            name: "check",
            desc: "Check how much money you have",
            args: [], // A required field.
            func: async () => {
                // Same as above.
            },
        }),
    ],
});
```

And you register it by adding it to the `registerCmds` call:

```ts
registerCmds([money]);
```

Easy peasy, right?
