import { errorThrower } from "@errors/handlers/HandlersFuncts";
import { InternalError } from "@errors/InternalError";


export class FileTransportError extends InternalError {
    public status: number = 50

    constructor(
        message: string,
        public code = 'FileTransport Error',
        status = 0
    ) {
        super(message)
        this.name = this.constructor.name
        this.status += status
    }
}

export function requireFileSystem(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new FileTransportError(
            'FileTransport requires Node.js (fs is unavailable in this runtime)',
            'FILE_SYSTEM_UNAVAILABLE',
            1
        )
    )
}
