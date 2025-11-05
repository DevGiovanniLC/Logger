import { ConsoleTransport } from "@core/Transport/ConsoleTransport";
import { LogTransport, TransportMode } from "@core/Transport/LogTransport";


export type TransportParam = Array<TransportMode | LogTransport> | LogTransport | TransportMode;

const MODE_FACTORIES: Record<TransportMode, () => LogTransport> = {
    console: () => new ConsoleTransport(),
    "console-emoji": () => new ConsoleTransport({ defaultFormaterOptions: { withEmojis: true } }),
    "console-color": () => new ConsoleTransport({ defaultFormaterOptions: { color: true } }),
    "console-styled": () =>
        new ConsoleTransport({ defaultFormaterOptions: { color: true, withEmojis: true } }),
};

const isLogTransport = (value: LogTransport | TransportMode): value is LogTransport =>
    typeof value !== "string";

export class TransportResolver {
    static resolve(transportParam: TransportParam): LogTransport[] {
        if (Array.isArray(transportParam)) return this.resolveFromArray(transportParam);
        if (typeof transportParam === "string") return this.resolveFromMode(transportParam);
        return [transportParam];
    }

    private static resolveFromArray(list: Array<LogTransport | TransportMode>): LogTransport[] {
        const transports = list.filter(isLogTransport);
        const modes = new Set<TransportMode>();

        for (const entry of list) {
            if (typeof entry === "string") modes.add(entry);
        }

        for (const mode of modes) {
            transports.push(...this.resolveFromMode(mode));
        }

        return transports;
    }

    private static resolveFromMode(transportMode: TransportMode): LogTransport[] {
        const factory = MODE_FACTORIES[transportMode];
        return factory ? [factory()] : [];
    }
}
