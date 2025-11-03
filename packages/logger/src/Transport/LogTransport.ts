import { Log } from "../types/Log.type";

export interface LogTransport {
    log(log: Log): void;
}

export type TransportMode = 'Console' | 'ConsoleWithEmojis'
