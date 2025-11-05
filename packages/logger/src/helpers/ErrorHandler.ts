export type ErrorBuilder<E extends Error = Error> = new (message?: string, options?: ErrorOptions) => E;

export function buildError<E extends Error>(
    subject: string,
    input: Error | ErrorBuilder<E>,
    message?: string,
    options?: ErrorOptions
): Error {
    if (input instanceof Error) return input;
    return new input(`(${subject}) ${message ? `- ${message}` : ''}`.trim(), options);
}
