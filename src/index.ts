import eris from "eris";
import "dotenv/config";

const bot = new (eris as any)(process.env.TOKEN);

bot.on("ready", () => {
    console.log("Connected");
});

bot.on("messageCreate", async (msg) => {
    const botWasMentioned = msg.mentions.find(
        (mentionedUser) => mentionedUser.id === bot.user.id
    );

    if (botWasMentioned) {
        try {
            await msg.channel.createMessage("Present");
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

bot.on("error", (err) => {
    console.warn(err);
});

bot.connect();
