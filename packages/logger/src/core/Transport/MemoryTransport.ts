import { Log } from '@models/Log.type';
import { LogTransport, TransportParams } from './LogTransport';

/**
 * Additional configuration specific to {@link MemoryTransport}.
 */
export type MemoryTransportParams = TransportParams & {
    /**
     * Optional safeguard that trims the buffer once the limit is exceeded.
     */
    maxBufferSize?: number;
};

/**
 * Transport that keeps formatted logs in memory.
 *
 * Useful for tests, assertions or collecting telemetry without writing to
 * external systems. The buffer can be bounded to avoid unbounded memory usage.
 */
export class MemoryTransport extends LogTransport {
    private readonly _logs: string[] = [];
    private readonly maxBufferSize?: number;

    /**
     * Live (read-only) view of the internal buffer.
     */
    public get logs(): readonly string[] {
        return this._logs;
    }

    /**
     * @param transportParams Base formatter options plus the optional buffer cap.
     */
    constructor(transportParams: MemoryTransportParams = {}) {
        super('memory', transportParams);
        this.maxBufferSize = transportParams.maxBufferSize;
    }

    /**
     * Removes every stored log without reinstantiating the transport.
     */
    public clear(): void {
        if (this._logs.length === 0) return;
        this._logs.length = 0;
    }

    /**
     * Safe snapshot that callers can mutate freely.
     */
    public snapshot(): string[] {
        return [...this._logs];
    }

    /**
     * Store the formatted string and keep the buffer within bounds.
     */
    protected performEmit(log: Log): void {
        const text = this.formatter.format(log);
        this._logs.push(text);

        if (this.maxBufferSize && this._logs.length > this.maxBufferSize) {
            this._logs.shift();
        }
    }
}
