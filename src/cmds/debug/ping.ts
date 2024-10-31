import { CommandContext } from "../../types";

export default {
    name: "ping",
    description: "Gets the latency of the bot in ms",
    usage: "<None>",

    async exec(ctx: CommandContext) {
        const timeSent = ctx.msg.createdAt;
        const timeNow = Date.now();

        return ctx.reply({
            content: `${timeNow - timeSent} ms`,
        });
    },
};
