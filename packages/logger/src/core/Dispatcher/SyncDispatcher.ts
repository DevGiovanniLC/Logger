import { LogTransport } from '@core/Transport/LogTransport';
import { LogDispatcher } from './LogDispatcher';
import { Level } from '@models/Level.type';
import { Log } from '@models/Log.type';
import { MetricsCollector } from '@models/Metrics.type';

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
export class SyncDispatcher extends LogDispatcher {
    /**
     * Creates a new synchronous dispatcher.
     * @param transports Array of active transports that will receive log events.
     * @param minLevel Minimum log level to emit. Defaults to `Level.Debug`.
     * @param metrics Optional metrics recorder.
     */
    constructor(
        transports: LogTransport[],
        minLevel: Level = Level.debug,
        metrics?: MetricsCollector,
    ) {
        super(transports, minLevel, metrics);
    }

    /**
     * Dispatches a single log entry to all transports that
     * meet the current severity threshold.
     *
     * @param log The log object to process.
     */
    dispatch(log: Log): void {
        const encounteredError = this.emitToTransports(log);

        if (encounteredError) {
            // keep compatibility: transport errors already swallowed
        }
    }
}
