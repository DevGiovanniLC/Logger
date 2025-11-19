import { errorThrower } from '@errors/handlers/HandlersFuncts';
import { InternalError } from '@errors/InternalError';

/**
 * Error raised when the console transport cannot rely on the host console.
 */
export class ConsoleTransportError extends InternalError {
    public status: number = 40;

    constructor(
        message: string,
        public code = 'ConsoleTransport Error',
        status = 0,
    ) {
        super(message);
        this.name = this.constructor.name;
        this.status += status;
    }
}

/**
 * Guard that enforces the availability of the required console APIs.
 * @param boundary Object/function used to trim stack frames.
 * @param missing Optional list of console methods not provided by the runtime.
 */
export function requireConsole(
    boundary: Function | Object,
    missing?: string[],
): never {
    const detail =
        missing && missing.length > 0
            ? ` Missing methods: ${missing.join(', ')}.`
            : '';
    return errorThrower(
        boundary,
        new ConsoleTransportError(
            `ConsoleTransport requires a console implementation with stderr/stdout helpers.${detail}`,
            'CONSOLE_UNAVAILABLE',
            1,
        ),
    );
}
