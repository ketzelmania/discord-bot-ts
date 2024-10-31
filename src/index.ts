/*
 *
 * Main access point for bot
 * Includes handling for receiving messages,
 * parsing command args, and formatting cmd
 * reply messages for Discord
 *
 */

import Eris, { GuildTextableChannel } from "eris";
import FsSync from "fs";
import path, { dirname } from "path";
import { CommandContext, CommandData, RepliableContent } from "./types";
import { fileURLToPath } from "url";

/* Global variables */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = JSON.parse(FsSync.readFileSync("./config.json", "utf-8"));

const bot = new (Eris as any)(config.token, {
    getAllUsers: true,
    intents: ["all"],
});

let commands: {
    [key: string]: CommandData;
} = {};

/* Methods */

/**
 * Loads all commands in a provided directory, returning them as an object
 *
 * @async
 * @param {string} directory - The path of the directory to process
 * @returns {Promise<{ [key: string]: CommandData }>} The loaded command modules
 */
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

/**
 * Loads all commands from this directory
 *
 * @async
 * @returns {Promise<{ [key: string]: CommandData }>} All loaded command modules
 */
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

/**
 * Checks if a given Eris.Message has the proper command prefix
 *
 * @param {Eris.Message} message - The message to parse
 * @returns {boolean} Whether the message is prefixed with the prefix
 */
function messageHasPrefix(message: Eris.Message): boolean {
    return message.content.startsWith(config.prefix);
}

/**
 * Function to see if a given variable is an object or an array
 *
 * @param {any} x - Variable to check
 * @returns {boolean} True if variable is object or array
 */
function isObjectOrArray(x: any): boolean {
    return typeof x === "object" && x !== null;
}

/**
 * Converts a text-only message object to an object aligning with an Eris message content
 *
 * @param {any} content - Content to convert
 * @returns {{content: string}} Content converted to an object
 */
function convertContentToObject(content: any): { content: string } {
    return { content: content.toString() };
}

/**
 * Checks if advanced message content data has additional data (embeds, files)
 *
 * @param {Eris.AdvancedMessageContent} content - Content to check
 * @returns {boolean} True if the content contains additional data
 */
function doesNonStringContentHaveData(
    content: Eris.AdvancedMessageContent
): boolean {
    return !!(content.content || content.embeds || content.file);
}

/**
 * Formats JSON content to be in Discord markdown format
 *
 * @param {object} jsonData - Data to convert
 * @returns {Eris.AdvancedMessageContent} Object with converted data
 */
function formatJsonForDiscord(jsonData: object): Eris.AdvancedMessageContent {
    return {
        content: `\`\`\`json\n${JSON.stringify(jsonData, null, 4)}\`\`\``,
    };
}

/**
 * Formats RepliableContent to align with AdvancedMessageContent format
 *
 * @param {RepliableContent} content - Content to convert
 * @returns {Eris.AdvancedMessageContent} Converted content
 */
function correctContent(
    content: RepliableContent
): Eris.AdvancedMessageContent {
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

/**
 * Gets the proper channel in which a message should be sent and returns if that channel
 * is unique from the one in which the original message was sent
 *
 * @param {Eris.Message<GuildTextableChannel>} message - The original message
 * @param {string} [channel] - Channel ID override
 * @returns {[Eris.GuildTextableChannel, boolean]} The proper channel and True if it is unique
 */
function getProperChannel_shouldReferenceMessage(
    message: Eris.Message<GuildTextableChannel>,
    channel?: string
): [Eris.GuildTextableChannel, boolean] {
    if (channel)
        return [
            message.channel.guild.channels.find(
                (c: Eris.GuildTextableChannel) => c.id === channel
            ),
            false,
        ];

    return [message.channel, true];
}

/**
 * Modifies reply content to reference the original message if they are in the
 * same channel, and fixed allowedMentions in both cases
 *
 * @param {Eris.Message} message - The original message
 * @param {Eris.AdvancedMessageContent} replyContent - The current reply content
 * @param {boolean} shouldReferenceMessage - True if the reply should reference the original message
 * @returns {Eris.AdvancedMessageContent} The corrected reply content
 */
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

    const args = message.content.substring(config.prefix.length).split(" ");

    const desiredCommand = args.shift();
    const command = commands[desiredCommand];

    if (!command) return;

    // TODO: add file as an arg to replycontent and remove from message data

    const ctx: CommandContext = {
        args: args,
        bot: bot,
        msg: message,
        config: config,

        reply: function (
            content: RepliableContent,
            channel?: string
        ): Promise<Eris.Message> {
            let replyContent = correctContent(content);
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
});

bot.on("error", (err: string) => {
    console.warn(err);
});

bot.connect();
