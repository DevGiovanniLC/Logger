export abstract class LoggerError extends Error {
    public code: string;
    public abstract status: number

    constructor(
        message: string,
    ) {
        super(message)
        this.name = this.constructor.name
    }
}

export class MetricError extends LoggerError {
    public status: number = 30
    constructor(message: string, public code = 'Metric error', status = 0) {
        super(message)
        this.name = this.constructor.name
        this.status += status
    }
}


