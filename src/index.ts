import Eris from "eris";
import FsSync from "fs";
import "dotenv/config";
import path, { dirname } from "path";
import { CommandData } from "./types";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const bot = new (Eris as any)(process.env.TOKEN, {
    getAllUsers: true,
    intents: ["all"],
});

let commands: {
    [key: string]: CommandData;
} = {};

function messageHasPrefix(message: Eris.Message): boolean {
    return message.content.startsWith(process.env.PREFIX);
}

function loadCommandsInDirectory(directory: string) {
    const commands = FsSync.readdirSync(directory);
    let loadedCommands = {};

    for (let i = 0; i < commands.length; i++) {
        import(path.join(directory, commands[i])).then(
            (command) => (loadedCommands[command.name] = command)
        );
    }

    return loadedCommands;
}

function loadAllCommands(): { [key: string]: CommandData } {
    const categories = FsSync.readdirSync(path.join(__dirname, "cmds"));
    let loadedCategories = {};

    for (const category of categories) {
        loadedCategories[category] = loadCommandsInDirectory(
            path.join(__dirname, "cmds", category)
        );
    }

    return loadedCategories;
}

bot.on("ready", () => {
    console.log("Connected");

    commands = loadAllCommands();
});

bot.on("messageCreate", async (message: Eris.Message) => {
    if (!messageHasPrefix(message)) return;

    const args = message.content
        .substring(process.env.PREFIX.length)
        .split(" ");

    const desiredCommand = args.shift();
    const command = commands[desiredCommand];

    console.log(desiredCommand);
    console.log(commands);
    console.log(command);

    if (!command) return;

    console.log(command);

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
