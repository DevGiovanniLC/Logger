import { Log } from '@models/Log.type';
import { LogTransport, TransportParams } from './LogTransport';
import {
    networkFailure,
    requestError,
    requireEndpoint,
    requireFetchImplementation,
} from '@errors/TransportError/HttpTransportError';

/**
 * Additional options accepted by {@link HttpTransport}.
 */
export type HttpTransportParams = TransportParams & {
    /**
     * Fully qualified endpoint that will receive POST requests.
     */
    endpoint?: string;
    /**
     * Optional headers appended to every request.
     */
    headers?: Record<string, string>;
    /**
     * Timeout (in milliseconds) applied to each request. Defaults to 5000 ms.
     */
    timeoutMs?: number;
    /**
     * When true, failed requests keep the payload in the queue for a later retry.
     */
    retryOnFailure?: boolean;
};

type PendingPayload = {
    /**
     * Serialized body sent in the request.
     */
    body: string;
    /**
     * Raw log entry, useful for debugging errors.
     */
    log: Log;
};

/**
 * Transport that POSTs each formatted log entry to a remote HTTP endpoint.
 *
 * Logs are formatted, serialized, and placed on a queue that is drained
 * sequentially to preserve ordering.
 */
export class HttpTransport extends LogTransport {
    private readonly endpoint: string;
    private readonly headers: Record<string, string>;
    private readonly timeoutMs: number;
    private readonly retryOnFailure: boolean;

    private readonly queue: PendingPayload[] = [];
    private flushing = false;

    constructor(params: HttpTransportParams) {
        super('http', params);
        if (!params?.endpoint) {
            requireEndpoint(this);
        }
        this.endpoint = params.endpoint;
        this.headers = params.headers ?? {};
        this.timeoutMs = params.timeoutMs ?? 5000;
        this.retryOnFailure = Boolean(params.retryOnFailure);

        if (typeof fetch !== 'function') {
            requireFetchImplementation(this);
        }
    }

    /**
     * Format the log and enqueue it for delivery.
     */
    protected performEmit(log: Log): void {
        const payload: PendingPayload = {
            body: JSON.stringify({
                formatted: this.formatter.format(log),
                log,
            }),
            log,
        };

        this.queue.push(payload);
        this.flushQueue();
    }

    /**
     * Sequentially POST queued payloads while preserving the original order.
     */
    private flushQueue(): void {
        if (this.flushing || this.queue.length === 0) return;
        this.flushing = true;

        const process = async () => {
            while (this.queue.length > 0) {
                const payload = this.queue[0];
                try {
                    await this.post(payload.body);
                    this.queue.shift();
                } catch (error) {
                    if (!this.retryOnFailure) {
                        this.queue.shift();
                    }
                    console.error(
                        'HttpTransport error:',
                        error,
                        'log:',
                        payload.log,
                    );
                    break;
                }
            }
            this.flushing = false;
            if (this.queue.length > 0) {
                this.flushQueue();
            }
        };

        void process();
    }

    /**
     * Send the payload to the configured endpoint with timeout protection.
     */
    private async post(body: string): Promise<void> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...this.headers,
                },
                body,
                signal: controller.signal,
            });

            if (!response.ok) {
                requestError(this, response.status);
            }
        } catch (error) {
            networkFailure(this, error);
        } finally {
            clearTimeout(timer);
        }
    }
}
