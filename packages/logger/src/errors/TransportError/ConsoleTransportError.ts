import { errorThrower } from '@errors/handlers/HandlersFuncts';
import { InternalError } from '@errors/InternalError';

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
