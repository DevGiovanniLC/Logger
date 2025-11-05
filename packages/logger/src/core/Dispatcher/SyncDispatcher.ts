import { LogTransport } from "@core/Transport/LogTransport";
import { LogDispatcher } from "./LogDispatcher";
import { Level } from "@models/Level.type";
import { Log } from "@models/Log.type";

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
    private readonly transports: readonly LogTransport[];

    /**
     * Creates a new synchronous dispatcher.
     * @param transports Array of active transports that will receive log events.
     * @param minLevel Minimum log level to emit. Defaults to `Level.Debug`.
     */
    constructor(transports: LogTransport[], private readonly minLevel: Level = Level.Debug) {
        this.transports = transports.slice();
    }

    /**
     * Dispatches a single log entry to all transports that
     * meet the current severity threshold.
     *
     * @param log The log object to process.
     */
    dispatch(log: Log): void {
        if (log.level > this.minLevel || this.transports.length === 0) return;

        for (const transport of this.transports) {
            transport.log(log);
        }
    }
}

