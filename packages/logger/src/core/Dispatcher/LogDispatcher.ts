import { LogTransport } from '@core/Transport/LogTransport';
import { Level } from '@models/Level.type';
import { Log } from '@models/Log.type';
import { MetricsCollector } from '@models/Metrics.type';

/**
 * Base class implemented by log dispatchers responsible for delivering records to transports.
 *
 * Provides shared wiring for transports, level filtering and metrics collection so subclasses
 * focus solely on the scheduling strategy.
 */
export abstract class LogDispatcher {
    protected readonly transports: readonly LogTransport[];

    protected constructor(
        transports: LogTransport[],
        protected readonly minLevel: Level,
        protected readonly metrics?: MetricsCollector,
    ) {
        this.transports = transports.slice();
    }

    /**
     * Deliver a log entry to the configured transports.
     * @param log Structured log entry ready for emission.
     */
    public abstract dispatch(log: Log): void;

    /**
     * Helper that applies level filtering, metrics, and emits the log to all transports.
     * @returns `true` when at least one transport threw during emission.
     */
    protected emitToTransports(log: Log): boolean {
        if (log.level > this.minLevel) {
            this.metrics?.recordFiltered();
            return false;
        }

        if (this.transports.length === 0) return false;

        let encounteredError = false;

        for (const transport of this.transports) {
            try {
                transport.emit(log);
            } catch {
                encounteredError = true;
                this.metrics?.recordTransportError();
            }
        }

        this.metrics?.recordDispatched();

        return encounteredError;
    }
}
