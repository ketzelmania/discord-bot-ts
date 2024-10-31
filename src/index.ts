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
import { fileURLToPath } from "url";

import { CommandContext, CommandData, RepliableContent } from "./types";
import {
    correctContent,
    getProperChannel_shouldReferenceMessage,
    mutateReplyContentForProperChannelData,
} from "./utility/messageReceivePipeline";
import { getAdminLevel } from "./utility/getAdminLevel";

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

bot.on("ready", async () => {
    console.log("Connected");

    commands = await loadAllCommands();
});

/* Method Connection */

bot.on("messageCreate", async (message: Eris.Message<GuildTextableChannel>) => {
    if (!messageHasPrefix(message)) return;

    const args = message.content.substring(config.prefix.length).split(" ");

    const desiredCommand = args.shift();
    const command = commands[desiredCommand];

    console.log(getAdminLevel(config, message.member));

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
