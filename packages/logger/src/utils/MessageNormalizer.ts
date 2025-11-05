export function normalizeMessage(message: unknown): string {
    if (typeof message === "string") return message;
    if (message instanceof Error) return message.stack ?? `${message.name}: ${message.message}`;
    if (message === undefined) return "undefined";
    if (message === null) return "null";
    if (typeof message === "number" || typeof message === "boolean" || typeof message === "bigint" || typeof message === "symbol") {
        return String(message);
    }
    if (typeof message === "function") {
        return message.name ? `[function ${message.name}]` : message.toString();
    }
    if (typeof message === "object") {
        return stringifyObject(message);
    }
    return String(message);
}

function stringifyObject(value: object): string {
    const seen = new WeakSet<object>();
    try {
        const result = JSON.stringify(value, (_key, val) => {
            if (typeof val === "bigint" || typeof val === "symbol") return String(val);
            if (typeof val === "function") return val.name ? `[function ${val.name}]` : "[function]";
            if (val && typeof val === "object") {
                if (seen.has(val as object)) return "[Circular]";
                seen.add(val as object);
            }
            return val;
        });
        return result ?? Object.prototype.toString.call(value);
    } catch {
        return Object.prototype.toString.call(value);
    }
}
