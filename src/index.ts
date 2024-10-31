import Eris from "eris";
import "dotenv/config";

const bot = new (Eris as any)(process.env.TOKEN, {
    getAllUsers: true,
    intents: ["all"],
});

function hasPrefix(message: Eris.Message): boolean {
    return message.content.startsWith(process.env.PREFIX);
}

bot.on("ready", () => {
    console.log("Connected");
});

bot.on("messageCreate", async (message: Eris.Message) => {
    if (!hasPrefix(message)) {
        return;
    }

    const args = message.content
        .substring(process.env.PREFIX.length)
        .split(" ");

    const desiredCommand = args.shift();

    // TODO: FsSync to collect names of commands
    // then run the command lol

    const botWasMentioned = message.mentions.find(
        (mentionedUser) => mentionedUser.id === bot.user.id
    );

    if (botWasMentioned) {
        try {
            await message.channel.createMessage("Present");
        } catch (err) {
            // There are various reasons why sending a message may fail.
            // The API might time out or choke and return a 5xx status,
            // or the bot may not have permission to send the
            // message (403 status).
            console.warn("Failed to respond to mention.");
            console.warn(err);
        }
    }
});

bot.on("error", (err: string) => {
    console.warn(err);
});

bot.connect();
