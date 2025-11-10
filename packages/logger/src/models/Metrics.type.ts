export type MetricsKey = "built" | "dispatched" | "filtered" | "transportErrors";

/** Snapshot of counters collected by a logger instance. */
export type LoggerMetrics = Readonly<Record<MetricsKey, number>>;

/** Callback surface used to record individual metric updates. */
export type MetricsCollector = {
    recordBuilt(): void;
    recordDispatched(): void;
    recordFiltered(): void;
    recordTransportError(): void;
};

/** Configuration for enabling metrics and receiving update notifications. */
export type MetricsOptions = Readonly<{
    /**
     * Toggle metrics collection without needing a callback. Defaults to `false`.
     */
    enabled?: boolean;
    /**
     * Optional observer that receives a fresh {@link LoggerMetrics} snapshot whenever a counter
     * increments (e.g. `built`, followed by `dispatched` or `filtered`). Expect multiple calls per log.
     */
    onUpdate?: (metrics: LoggerMetrics) => void;
}>;

/** Zero-initialized metrics constant reused to avoid allocations. */
export const ZERO_METRICS: LoggerMetrics = Object.freeze({
    built: 0,
    dispatched: 0,
    filtered: 0,
    transportErrors: 0,
});

/** Mutable backing store used internally before exposing read-only snapshots. */
export type MutableMetrics = Record<MetricsKey, number>;
