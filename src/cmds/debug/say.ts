import { CommandContext } from "../../types";

export default {
    name: "say",
    description: "Says a message",
    usage: "<message...>",

    async exec(ctx: CommandContext) {
        ctx.msg.delete();

        return ctx.reply({
            content: ctx.args.join(" "),
            messageReference: null,
        });
    },
};
