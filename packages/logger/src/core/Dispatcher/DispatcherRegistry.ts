import { LogTransport } from '@core/Transport/LogTransport';
import { Level } from '@models/Level.type';
import { MetricsCollector } from '@models/Metrics.type';
import { LogDispatcher } from './LogDispatcher';
import { SyncDispatcher } from './SyncDispatcher';
import { ReactiveDispatcher } from './ReactiveDispatcher';
import { UnexpectedDispatcher } from '@errors/DispatcherError/DispatcherError';

/**
 * Built-in modes supported by the dispatcher resolver.
 */
export type DispatcherMode = 'sync' | 'reactive';

/**
 * Factory signature for creating dispatcher implementations.
 */
type DispatcherFactory = (
    transports: LogTransport[],
    minLevel: Level,
    metrics?: MetricsCollector,
) => LogDispatcher;

/**
 * Registry mapping dispatcher keys to their respective factories.
 */
export const DISPATCHER_FACTORIES: Record<DispatcherMode, DispatcherFactory> = {
    sync: (transports, minLevel, metrics) =>
        new SyncDispatcher(transports, minLevel, metrics),
    reactive: (transports, minLevel, metrics) =>
        new ReactiveDispatcher(transports, minLevel, undefined, metrics),
};

export type DispatcherKey = keyof typeof DISPATCHER_FACTORIES;

/**
 * Runtime guard that validates whether the provided string matches a dispatcher key.
 * @param value Raw value to test.
 */
export const isDispatcherKey = (value: string): value is DispatcherKey =>
    value === 'sync' || value === 'reactive';

/**
 * Normalize user-provided dispatcher mode strings into supported keys.
 * @param mode Requested mode or `undefined` for defaults.
 * @returns A dispatcher factory key understood by the resolver.
 * @throws Error when the value cannot be normalized.
 */
export const normalizeDispatcher = (mode?: DispatcherMode): DispatcherKey => {
    const raw = mode ?? 'sync';
    const normalized = raw.toString().toLowerCase();
    if (isDispatcherKey(normalized)) return normalized;
    UnexpectedDispatcher(this, raw);
};
