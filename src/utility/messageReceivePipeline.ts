import Eris from "eris";
import { RepliableContent } from "../types";

/**
 * Function to see if a given variable is an object or an array
 *
 * @param {any} x - Variable to check
 * @returns {boolean} True if variable is object or array
 */
export function isObjectOrArray(x: any): boolean {
    return typeof x === "object" && x !== null;
}

/**
 * Converts a text-only message object to an object aligning with an Eris message content
 *
 * @param {any} content - Content to convert
 * @returns {{content: string}} Content converted to an object
 */
export function convertContentToObject(content: any): { content: string } {
    return { content: content.toString() };
}

/**
 * Checks if advanced message content data has additional data (embeds, files)
 *
 * @param {Eris.AdvancedMessageContent} content - Content to check
 * @returns {boolean} True if the content contains additional data
 */
export function doesNonStringContentHaveData(
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
export function formatJsonForDiscord(
    jsonData: object
): Eris.AdvancedMessageContent {
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
export function correctContent(
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
export function getProperChannel_shouldReferenceMessage(
    message: Eris.Message<Eris.GuildTextableChannel>,
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
export function mutateReplyContentForProperChannelData(
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
