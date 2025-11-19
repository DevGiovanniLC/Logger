import { FileTransport } from '@core/Transport';
import { ConsoleTransport } from '@core/Transport/ConsoleTransport';
import { LogTransport, TransportMode } from '@core/Transport/LogTransport';

/**
 * Accepted transport configuration shape: raw modes, concrete transports, or arrays mixing both.
 */
export type TransportParam =
    | Array<TransportMode | LogTransport>
    | LogTransport
    | TransportMode;

const MODE_FACTORIES: Record<TransportMode, () => LogTransport> = {
    console: () => new ConsoleTransport(),
    'console-emoji': () =>
        new ConsoleTransport({ defaultFormaterOptions: { withEmojis: true } }),
    'console-color': () =>
        new ConsoleTransport({ defaultFormaterOptions: { color: true } }),
    'console-styled': () =>
        new ConsoleTransport({
            defaultFormaterOptions: { color: true, withEmojis: true },
        }),
    file: () => new FileTransport(),
};

/**
 * Type guard that narrows configuration entries to instantiated transports.
 */
const isLogTransport = (
    value: LogTransport | TransportMode,
): value is LogTransport => typeof value !== 'string';

/**
 * Utility that converts configuration parameters into instantiated transports.
 */
export class TransportResolver {
    /**
     * Resolve a transport configuration into concrete instances.
     * @param transportParam Mode string, transport instance, or array of both.
     * @returns Array of initialized transports.
     */
    static resolve(transportParam: TransportParam): LogTransport[] {
        if (Array.isArray(transportParam))
            return this.resolveFromArray(transportParam);
        if (typeof transportParam === 'string')
            return this.resolveFromMode(transportParam);
        return [transportParam];
    }

    /**
     * Resolve an array of modes and transports, avoiding duplicates.
     */
    private static resolveFromArray(
        list: Array<LogTransport | TransportMode>,
    ): LogTransport[] {
        const transports = list.filter(isLogTransport);
        const modes = new Set<TransportMode>();

        for (const entry of list) {
            if (typeof entry === 'string') modes.add(entry);
        }

        for (const mode of modes) {
            transports.push(...this.resolveFromMode(mode));
        }

        return transports;
    }

    /**
     * Instantiate transports for the provided predefined mode.
     */
    private static resolveFromMode(
        transportMode: TransportMode,
    ): LogTransport[] {
        const factory = MODE_FACTORIES[transportMode];
        return factory ? [factory()] : [];
    }
}
