import { LogTransport } from "../Transport/LogTransport";
import { Level } from "../types/Level.type";
import { Log } from "../types/Log.type";
import { LogDispatcher } from "./LogDispatcher";

/**
 * Synchronous log dispatcher.
 *
 * This dispatcher immediately sends every accepted log
 * to all configured transports on the same thread,
 * without buffering or asynchronous behavior.
 *
 * Suitable for Node.js or backend contexts where
 * reliability and deterministic order are preferred
 * over non-blocking performance.
 */
export class SyncDispatcher implements LogDispatcher {
    /**
     * Creates a new synchronous dispatcher.
     * @param transports Array of active transports that will receive log events.
     * @param minLevel Minimum log level to emit. Defaults to `Level.Debug`.
     */
    constructor(
        private readonly transports: LogTransport[],
        private readonly minLevel: Level = Level.Debug
    ) { }

    /**
     * Dispatches a single log entry to all transports that
     * meet the current severity threshold.
     *
     * @param log The log object to process.
     */
    dispatch(log: Log): void {
        for (const t of this.transports) {
            if (log.level > this.minLevel) continue
            t.log(log);
        }
    }
}

