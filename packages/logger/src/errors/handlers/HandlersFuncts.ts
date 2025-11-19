import { InternalError } from "@errors/InternalError"


export function errorThrower(boundary: Function | Object | undefined, error: InternalError): never {
    const proto = Object.getPrototypeOf(boundary ?? {})
    const getterFn = Object.getOwnPropertyDescriptor(proto, 'metrics')?.get
    // Excluir el getter del stack para que apunte al caller
    if (getterFn && Error.captureStackTrace) {
        Error.captureStackTrace(error, getterFn)
    }
    throw externalizeStack(error)
}

/**
 * Remove internal frames from logger errors so consumers see actionable stack traces.
 * @param err Logger error instance to mutate.
 * @param exclude Additional patterns that should be trimmed from the stack.
 * @returns The same error instance with a filtered stack.
 */
function externalizeStack(err: InternalError, exclude: RegExp[] = []): InternalError {
    if (!err.stack) return
    const lines = err.stack.split('\n')
    const head = lines[0]
    const body = lines.slice(1)

    const rx = [
        /@giodev\/logger/,
        /node_modules/,
        /node:internal/,
        /internal\/modules/,
        /ModuleJob\.run/,
        /asyncRunEntryPointWithESMLoader/,
        ...exclude,
    ]

    const filtered = body.filter(l => !rx.some(r => r.test(l)))
    const first = filtered[0] ?? body[0]
    err.stack = [head, first, ...filtered.slice(1)].join('\n')
    return err
}
