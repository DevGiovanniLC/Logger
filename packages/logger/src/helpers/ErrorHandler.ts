/**
 * Constructor signature for custom {@link Error} subtypes that can be built on demand.
 * Accepts the standard message and {@link ErrorOptions} parameters available in modern runtimes.
 */
export type ErrorBuilder<E extends Error = Error> = new (
    message?: string,
    options?: ErrorOptions,
) => E;

/**
 * Normalize error inputs by returning existing {@link Error} instances or instantiating a custom one.
 * @param subject Log subject used to prefix the generated message.
 * @param input Either an {@link Error} instance or a constructor for a custom error subtype.
 * @param message Optional additional context appended to the generated message.
 * @param options Extra {@link ErrorOptions} forwarded to the error constructor.
 * @returns A concrete {@link Error} ready to be thrown.
 */
export function buildError<E extends Error>(
    subject: string,
    input: Error | ErrorBuilder<E>,
    message?: string,
    options?: ErrorOptions,
): Error {
    if (input instanceof Error) return input;
    return new input(
        `(${subject}) ${message ? `- ${message}` : ''}`.trim(),
        options,
    );
}

/**
 * Runtime guard that checks whether a value is an {@link ErrorBuilder}.
 * @param value Arbitrary value to test.
 * @returns `true` when the value matches the {@link ErrorBuilder} contract.
 */
export function isErrorBuilder(value: unknown): value is ErrorBuilder {
    if (typeof value !== 'function') return false;
    const prototype = value.prototype;
    if (!prototype) return false;
    return (
        prototype === Error.prototype ||
        Error.prototype.isPrototypeOf(prototype)
    );
}

/**
 * Trim stack traces by capturing from the provided boundary when possible.
 * @param error Error instance to mutate.
 * @param stackContext Function used as the stack trace origin boundary.
 */
export function captureStack(error: Error, stackContext?: Function) {
    if (!stackContext) return;
    Error.captureStackTrace?.(error, stackContext);
}
