import { errorThrower } from '@errors/handlers/HandlersFuncts';
import { InternalError } from '@errors/InternalError';

/**
 * Base error for formatter related failures (e.g. Intl not supported).
 */
export class FormatterError extends InternalError {
    public status: number = 90;

    constructor(
        message: string,
        public code = 'Formatter Error',
        status = 0,
    ) {
        super(message);
        this.name = this.constructor.name;
        this.status += status;
    }
}

const detailMessage = (cause: unknown): string => {
    if (cause instanceof Error) return cause.message;
    if (typeof cause === 'string') return cause;
    return JSON.stringify(cause);
};

/**
 * Guard thrown when Intl.DateTimeFormat cannot be constructed.
 * @param boundary Formatter class/function used to trim the stack trace.
 * @param locales Locale argument originally forwarded to Intl.
 * @param cause Underlying error provided by the runtime.
 */
export function requireDateFormatter(
    boundary: Function | Object,
    locales: Intl.LocalesArgument | undefined,
    cause: unknown,
): never {
    const descriptor = locales ? ` for locale "${locales.toString()}"` : '';
    return errorThrower(
        boundary,
        new FormatterError(
            `Unable to initialize Intl.DateTimeFormat${descriptor}: ${detailMessage(cause)}`,
            'FORMATTER_INTL_UNAVAILABLE',
            1,
        ),
    );
}
