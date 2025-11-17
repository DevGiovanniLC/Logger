import { errorThrower } from "@errors/handlers/HandlersFuncts";
import { LoggerError } from "@errors/LoggerError";

export class HttpTransportError extends LoggerError{
    public status: number = 40

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
        boundary ,
        new HttpTransportError('You must provide an endpoint.', 'ENDPOINT_REQUIRED', 1)
    )
}
