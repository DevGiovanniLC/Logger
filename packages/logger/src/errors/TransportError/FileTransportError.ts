import { errorThrower } from '@errors/handlers/HandlersFuncts';
import { InternalError } from '@errors/InternalError';

/**
 * Error thrown when the file transport cannot access or mutate the filesystem.
 */
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

/**
 * Normalize error messages coming from native fs routines.
 */
const detailMessage = (cause: unknown): string => {
    if (cause instanceof Error) return cause.message;
    return typeof cause === 'string' ? cause : JSON.stringify(cause);
};

/**
 * Guard thrown when the runtime does not expose the Node.js filesystem APIs.
 * @param boundary Function or class used to trim frames from the stack trace.
 */
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

/**
 * Guard thrown when the transport cannot create the target directory tree.
 * @param boundary Owner used as the stack boundary.
 * @param targetDir Path that failed to be created.
 * @param cause Underlying error reported by `fs`.
 */
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

/**
 * Guard thrown when the transport cannot append log entries to disk.
 * @param boundary Owner used as the stack boundary.
 * @param filePath Resolved file that was being written.
 * @param cause Underlying error reported by `fs`.
 */
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
