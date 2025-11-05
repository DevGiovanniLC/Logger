import { LogTransport } from "@core/Transport/LogTransport";
import { Level } from "@models/Level.type";
import { Log } from "@models/Log.type";
import { MetricsCollector } from "@models/Metrics.type";
import { SyncDispatcher } from "./SyncDispatcher";
import { ReactiveDispatcher } from "./ReactiveDispatcher";


/**
 * Contract implemented by log dispatchers responsible for delivering records to transports.
 */
export interface LogDispatcher {
    /**
     * Deliver a log entry to the configured transports.
     * @param log Structured log entry ready for emission.
     */
    dispatch(log: Log): void;
}

/**
 * Built-in modes supported by the dispatcher resolver.
 */
export type DispatcherMode = "sync" | "reactive";

/**
 * Factory signature for creating dispatcher implementations.
 */
type DispatcherFactory = (transports: LogTransport[], minLevel: Level, metrics?: MetricsCollector) => LogDispatcher;

/**
 * Registry mapping dispatcher keys to their respective factories.
 */
export const DISPATCHER_FACTORIES: Record<"sync" | "reactive", DispatcherFactory> = {
    sync: (transports, minLevel, metrics) => new SyncDispatcher(transports, minLevel, metrics),
    reactive: (transports, minLevel, metrics) => new ReactiveDispatcher(transports, minLevel, undefined, metrics),
};

export type DispatcherKey = keyof typeof DISPATCHER_FACTORIES;

/**
 * Runtime guard that validates whether the provided string matches a dispatcher key.
 * @param value Raw value to test.
 */
export const isDispatcherKey = (value: string): value is DispatcherKey => value === "sync" || value === "reactive";


/**
 * Normalize user-provided dispatcher mode strings into supported keys.
 * @param mode Requested mode or `undefined` for defaults.
 * @returns A dispatcher factory key understood by the resolver.
 * @throws Error when the value cannot be normalized.
 */
export const normalizeDispatcher = (mode?: DispatcherMode): DispatcherKey => {
    const raw = mode ?? "sync";
    const normalized = raw.toString().toLowerCase();
    if (isDispatcherKey(normalized)) return normalized;
    throw new Error(`Unsupported dispatcher mode "${raw}". Expected "sync" or "reactive".`);
};
