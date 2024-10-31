import { CommandContext } from "../../types";

async function exec(ctx: CommandContext) {
    const code = ctx.args.join(" ");

    let thisFunction: () => any;

    try {
        thisFunction = eval(`async () => {${code}}`);
    } catch (e) {
        return await ctx.reply("Error evaluating:\n```ts\n" + e + "\n```");
    }

    let result: any;

    try {
        result = await thisFunction();
    } catch (e) {
        return await ctx.reply("Error running:\n```ts\n" + e + "\n```");
    }

    return await ctx.reply("Result: \n```ts\n" + result + "\n```");
}

export default {
    name: "eval",
    description: "Evaluate JS code",
    usage: "<code>",

    exec: exec,
};
