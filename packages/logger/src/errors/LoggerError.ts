import { errorThrower } from "./handlers/HandlersFuncts";

/**
 * Base error type for logger-specific failures.
 * Provides a shared {@link code} and {@link status} surface for downstream consumers.
 */
export abstract class LoggerError extends Error {
    public code: string;
    /**
     * Numeric severity/status code that downstream tooling can use for routing.
     */
    public abstract status: number

    constructor(
        message: string,
    ) {
        super(message)
        this.name = this.constructor.name
    }
}

/**
 * Error releated to logger metrics.
 */
export class MetricError extends LoggerError {
    public status: number = 30

    constructor(
        message: string,
        public code = 'Metric Error',
        status = 0
    ) {
        super(message)
        this.name = this.constructor.name
        this.status += status
    }
}

/**
 * Guard invoked by getters that expose metrics.
 * Throws a {@link MetricError} with a sanitized stack when metrics are disabled/missing.
 * @param boundary Function or object owning the getter so we can exclude it from the stack trace.
 * @throws MetricError Always throws to signal that metrics must be enabled.
 */
export function requireMetrics(boundary: Function | Object): never {
    return errorThrower(
        boundary ,
        new MetricError('You have to enable metrics to use them', 'METRICS_DISABLED', 1)
    )
}
