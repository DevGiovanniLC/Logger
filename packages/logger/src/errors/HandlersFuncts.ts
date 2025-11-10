import { LoggerError, MetricError } from "@errors/LoggerError"

/**
 * Guard invoked by getters that expose metrics.
 * Throws a {@link MetricError} with a sanitized stack when metrics are disabled/missing.
 * @param boundary Function or object owning the getter so we can exclude it from the stack trace.
 * @throws MetricError Always throws to signal that metrics must be enabled.
 */
export function requireMetrics(boundary: Function | Object): never {
    const proto = Object.getPrototypeOf(boundary)
    const getterFn = Object.getOwnPropertyDescriptor(proto, 'metrics')?.get
    // Excluir el getter del stack para que apunte al caller
    const err = new MetricError('You have to enable metrics to use them', 'METRICS_DISABLED', 1)
    if (getterFn && Error.captureStackTrace) {
        Error.captureStackTrace(err, getterFn)
    }
    throw externalizeStack(err)
}

/**
 * Remove internal frames from logger errors so consumers see actionable stack traces.
 * @param err Logger error instance to mutate.
 * @param exclude Additional patterns that should be trimmed from the stack.
 * @returns The same error instance with a filtered stack.
 */
function externalizeStack(err: LoggerError, exclude: RegExp[] = []): LoggerError {
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
