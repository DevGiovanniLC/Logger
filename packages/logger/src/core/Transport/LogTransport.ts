import { Log } from "@models/Log.type";

/**
 * Transport abstraction that delivers formatted logs to an output.
 */
export interface LogTransport {
    /**
     * Persist or display the provided log entry.
     * @param log Structured log payload.
     */
    log(log: Log): void;
}

/**
 * Built-in transport modes resolved by {@link TransportResolver}.
 */
export type TransportMode = 'console' | 'console-emoji' | 'console-color' | 'console-styled'
