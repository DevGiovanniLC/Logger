export type MetricsKey = "built" | "dispatched" | "filtered" | "transportErrors";

export type LoggerMetrics = Readonly<Record<MetricsKey, number>>;

export type MetricsCollector = {
    recordBuilt(): void;
    recordDispatched(): void;
    recordFiltered(): void;
    recordTransportError(): void;
};

export type MetricsOptions = Readonly<{
    enabled?: boolean;
    onUpdate?: (metrics: LoggerMetrics) => void;
}>;

export const ZERO_METRICS: LoggerMetrics = Object.freeze({
    built: 0,
    dispatched: 0,
    filtered: 0,
    transportErrors: 0,
});

export type MutableMetrics = Record<MetricsKey, number>;
