import Eris, { Guild, GuildTextableChannel } from "eris";
import FsSync from "fs";
import "dotenv/config";
import path, { dirname } from "path";
import { CommandContext, CommandData, RepliableContent } from "./types";
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

async function loadCommandsInDirectory(
    directory: string
): Promise<{ [key: string]: CommandData }> {
    const commands = FsSync.readdirSync(directory);
    let loadedCommands = {};

    for (let i = 0; i < commands.length; i++) {
        let thisCommand = await import(path.join(directory, commands[i]));
        loadedCommands[thisCommand.default.name] = thisCommand.default;
    }

    return loadedCommands;
}

async function loadAllCommands(): Promise<{ [key: string]: CommandData }> {
    const categories = FsSync.readdirSync(path.join(__dirname, "cmds"));
    let loadedCommands = {};

    for (const category of categories) {
        let theseCommands = await loadCommandsInDirectory(
            path.join(__dirname, "cmds", category)
        );

        loadedCommands = Object.assign({}, loadedCommands, theseCommands);
    }

    return loadedCommands;
}

function isObjectOrArray(x: any) {
    return typeof x === "object" && x !== null;
}

function convertContentToObject(content: Eris.AdvancedMessageContent) {
    return { content: content.toString() };
}

function doesNonStringContentHaveData(content: Eris.AdvancedMessageContent) {
    return content.content || content.embeds || content.file;
}

function formatJsonForDiscord(jsonData: object) {
    return {
        content: `\`\`\`json\n${JSON.stringify(jsonData, null, 4)}\`\`\``,
    };
}

function correctContent(content: RepliableContent) {
    let correctedContent = content as Eris.AdvancedMessageContent;

    if (!isObjectOrArray(correctedContent)) {
        correctedContent = convertContentToObject(correctedContent);
    } else {
        if (!doesNonStringContentHaveData(correctedContent)) {
            correctedContent = formatJsonForDiscord(correctedContent);
        }
    }

    return correctedContent;
}

function getProperChannel_shouldReferenceMessage(
    message: Eris.Message<GuildTextableChannel>,
    channel?: string
): [Eris.GuildTextableChannel, boolean] {
    if (channel)
        return [
            message.channel.guild.channels.find(
                (c) => c.id === channel
            ) as Eris.GuildTextableChannel,

            false,
        ];

    return [message.channel, true];
}

function mutateReplyContentForProperChannelData(
    message: Eris.Message,
    replyContent: Eris.AdvancedMessageContent,
    shouldReferenceMessage: boolean
): Eris.AdvancedMessageContent {
    if (shouldReferenceMessage) {
        replyContent = Object.assign(
            {},
            {
                messageReference: {
                    messageID: message.id,
                },
                allowedMentions: {
                    repliedUser: false,
                },
            },
            replyContent
        );
    } else {
        replyContent = Object.assign(
            {},
            {
                allowedMentions: {
                    repliedUser: false,
                },
            },
            replyContent
        );
    }

    return replyContent;
}

bot.on("ready", async () => {
    console.log("Connected");

    commands = await loadAllCommands();
});

bot.on("messageCreate", async (message: Eris.Message<GuildTextableChannel>) => {
    if (!messageHasPrefix(message)) return;

    const args = message.content
        .substring(process.env.PREFIX.length)
        .split(" ");

    const desiredCommand = args.shift();
    const command = commands[desiredCommand];

    if (!command) return;

    // TODO: add file as an arg to replycontent and remove from message data

    const ctx: CommandContext = {
        args: args,
        bot: bot,
        msg: message,

        reply: function (
            content: RepliableContent,
            channel?: string
        ): Promise<Eris.Message> {
            let replyContent = correctContent(message.content);
            let [replyChannel, shouldReferenceMessage] =
                getProperChannel_shouldReferenceMessage(message, channel);

            replyContent = mutateReplyContentForProperChannelData(
                message,
                replyContent,
                shouldReferenceMessage
            );

            return replyChannel.createMessage(replyContent);
        },
    };

    command.exec(ctx);

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
