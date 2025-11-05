import { Log } from "@models/Log.type";

export interface LogTransport {
    log(log: Log): void;
}

export type TransportMode = 'console' | 'console-emoji' | 'console-color' | 'console-styled'
