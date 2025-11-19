import { errorThrower } from "@errors/handlers/HandlersFuncts";
import { InternalError } from "@errors/InternalError";

export class HttpTransportError extends InternalError {
    public status: number = 60

    constructor(
        message: string,
        public code = 'HTTPTransport Error',
        status = 0
    ) {
        super(message)
        this.name = this.constructor.name
        this.status += status
    }
}

export function requireEndpoint(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new HttpTransportError(
            'You must provide an endpoint.',
            'ENDPOINT_REQUIRED',
            1
        )
    )
}

export function requireFetchImplementation(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new HttpTransportError(
            'You must provide a fetch implementation. Probably you are running in an unsupported environment.',
            'FETCH_IMPLEMENTATION_REQUIRED',
            2
        )
    )
}

export function requestError(boundary: Function | Object, status: number): never {
    return errorThrower(
        boundary,
        new HttpTransportError(
            `HttpTransport request failed with status ${status}`,
            'HTTP_REQUEST_FAILED',
            3
        )
    )
}

export function networkFailure(boundary: Function | Object, cause: unknown): never {
    const detail = cause instanceof Error ? cause.message : String(cause);
    return errorThrower(
        boundary,
        new HttpTransportError(
            `HttpTransport failed before receiving a response: ${detail}`,
            'HTTP_NETWORK_FAILURE',
            4
        )
    )
}
