import { Log } from "../types/Log.type";

export interface Transport {
    log(log: Log): void;
}

export type TransportMode = 'Console' | 'ConsoleWithEmojis'
