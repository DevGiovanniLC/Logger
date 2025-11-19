/**
 * Convert arbitrary values into human-readable strings for logging purposes.
 * @param message Value to normalize.
 * @returns String representation suitable for logs.
 */
export function normalizeMessage(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error)
        return message.stack ?? `${message.name}: ${message.message}`;
    if (message === undefined) return 'undefined';
    if (message === null) return 'null';
    if (
        typeof message === 'number' ||
        typeof message === 'boolean' ||
        typeof message === 'bigint' ||
        typeof message === 'symbol'
    ) {
        return String(message);
    }
    if (typeof message === 'function') {
        return message.name ? `[function ${message.name}]` : message.toString();
    }
    if (typeof message === 'object') {
        return stringifyObject(message);
    }
    return String(message);
}

/**
 * Safely stringify objects, handling cycles, functions, and unsupported types.
 * @returns JSON-like representation guarding against runtime errors.
 */
function stringifyObject(value: object): string {
    const seen = new WeakSet<object>();
    try {
        const result = JSON.stringify(value, (_key, val) => {
            if (typeof val === 'bigint' || typeof val === 'symbol')
                return String(val);
            if (typeof val === 'function')
                return val.name ? `[function ${val.name}]` : '[function]';
            if (val && typeof val === 'object') {
                if (seen.has(val as object)) return '[Circular]';
                seen.add(val as object);
            }
            return val;
        });
        return result ?? Object.prototype.toString.call(value);
    } catch {
        return Object.prototype.toString.call(value);
    }
}

/**
 * Derive a subject string from contextual information.
 * @param ctx Context object or explicit subject string.
 * @returns Human-readable subject for the log entry.
 */
export const resolveSubject = (ctx: object | string): string => {
    if (typeof ctx === 'string') return ctx;
    const name = ctx?.constructor?.name;
    return typeof name === 'string' && name.length > 0 ? name : 'Unknown';
};
