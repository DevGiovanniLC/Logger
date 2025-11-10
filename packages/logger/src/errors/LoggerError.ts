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
    constructor(message: string, public code = 'Metric error', status = 0) {
        super(message)
        this.name = this.constructor.name
        this.status += status
    }
}

