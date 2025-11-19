import { errorThrower } from '@errors/handlers/HandlersFuncts';
import { InternalError } from '@errors/InternalError';

export class FileTransportError extends InternalError {
    public status: number = 50;

    constructor(
        message: string,
        public code = 'FileTransport Error',
        status = 0,
    ) {
        super(message);
        this.name = this.constructor.name;
        this.status += status;
    }
}

const detailMessage = (cause: unknown): string => {
    if (cause instanceof Error) return cause.message;
    return typeof cause === 'string' ? cause : JSON.stringify(cause);
};

export function requireFileSystem(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new FileTransportError(
            'FileTransport requires Node.js (fs is unavailable in this runtime)',
            'FILE_SYSTEM_UNAVAILABLE',
            1,
        ),
    );
}

export function directorySetupFailed(
    boundary: Function | Object,
    targetDir: string,
    cause: unknown,
): never {
    return errorThrower(
        boundary,
        new FileTransportError(
            `Unable to prepare log directory "${targetDir}": ${detailMessage(cause)}`,
            'FILE_DIRECTORY_SETUP_FAILED',
            2,
        ),
    );
}

export function fileWriteFailed(
    boundary: Function | Object,
    filePath: string,
    cause: unknown,
): never {
    return errorThrower(
        boundary,
        new FileTransportError(
            `Unable to write log file "${filePath}": ${detailMessage(cause)}`,
            'FILE_WRITE_FAILED',
            3,
        ),
    );
}
