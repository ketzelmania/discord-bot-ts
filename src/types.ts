import type Eris from "eris";

export type CommandContext = {
    args: string[];
    bot: Eris.Client;
    msg: Eris.Message<Eris.GuildTextableChannel>;
    config: { string: any };

    reply(content: RepliableContent, channel?: string): Promise<Eris.Message>;
};

export type CommandData = {
    name: string;
    description: string;
    usage: string;

    exec(ctx: CommandContext): Promise<Eris.Message>;
};

export type RepliableContent =
    | Eris.MessageContent
    | object
    | any[]
    | number
    | boolean;
