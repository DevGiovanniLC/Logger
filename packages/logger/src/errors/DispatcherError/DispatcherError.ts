import { errorThrower } from '@errors/handlers/HandlersFuncts';
import { InternalError } from "@errors/InternalError"

export class DispatcherError extends InternalError {
    public status: number = 40

    constructor(
        message: string,
        public code = 'Dispatcher Error',
        status = 0
    ) {
        super(message)
        this.name = this.constructor.name
        this.status += status
    }
}


export function UnexpectedDispatcher(boundary: Function | Object | undefined, raw: string): never {
    return errorThrower(
        boundary,
        new DispatcherError(
            `Unsupported dispatcher mode "${raw}". Expected "sync" or "reactive".`,
            'DISPATCHER_UNEXPECTED',
            1
        )
    )
}
