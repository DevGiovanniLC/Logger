import { errorThrower } from '@errors/handlers/HandlersFuncts';
import { InternalError } from '@errors/InternalError';

/**
 * Error thrown when HTTP transports cannot deliver payloads.
 */
export class HttpTransportError extends InternalError {
    public status: number = 60;

    constructor(
        message: string,
        public code = 'HTTPTransport Error',
        status = 0,
    ) {
        super(message);
        this.name = this.constructor.name;
        this.status += status;
    }
}

/**
 * Guard thrown when the transport is instantiated without an endpoint.
 * @param boundary Owner used to trim stack frames.
 */
export function requireEndpoint(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new HttpTransportError(
            'You must provide an endpoint.',
            'ENDPOINT_REQUIRED',
            1,
        ),
    );
}

/**
 * Guard thrown when the runtime does not expose a global fetch implementation.
 * @param boundary Owner used to trim stack frames.
 */
export function requireFetchImplementation(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new HttpTransportError(
            'You must provide a fetch implementation. Probably you are running in an unsupported environment.',
            'FETCH_IMPLEMENTATION_REQUIRED',
            2,
        ),
    );
}

/**
 * Guard thrown when the remote endpoint responds with a failing status.
 * @param boundary Owner used to trim stack frames.
 * @param status HTTP status code returned by fetch.
 */
export function requestError(
    boundary: Function | Object,
    status: number,
): never {
    return errorThrower(
        boundary,
        new HttpTransportError(
            `HttpTransport request failed with status ${status}`,
            'HTTP_REQUEST_FAILED',
            3,
        ),
    );
}

/**
 * Guard thrown for network failures (DNS, TLS, connection aborts, etc.).
 * @param boundary Owner used to trim stack frames.
 * @param cause Original error emitted by fetch/the runtime.
 */
export function networkFailure(
    boundary: Function | Object,
    cause: unknown,
): never {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return errorThrower(
        boundary,
        new HttpTransportError(
            `HttpTransport failed before receiving a response: ${detail}`,
            'HTTP_NETWORK_FAILURE',
            4,
        ),
    );
}
