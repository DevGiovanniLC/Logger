import { LoggerError, MetricError } from "@errors/LoggerError"

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
