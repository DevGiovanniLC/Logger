import { ErrorBuilder } from "@helpers/ErrorHandler";
import { LoggerMetrics } from "./Metrics.type";
import { Log } from "./Log.type";


/**
 * Signature for simple log-level helpers that accept arbitrary messages.
 */
export type LevelFn = (message: unknown) => Log;

/**
 * Signature for high-severity helpers that also accept error builders.
 */
export type ErrorLevelFn = LevelFn & {
    (error: Error): never;
    <E extends Error>(builder: ErrorBuilder<E>, message?: unknown, options?: ErrorOptions): never;
};

/**
 * Contextualized logger surface exposed to application code.
 */
export type ContextLogger = Readonly<{
    emergency: ErrorLevelFn;
    alert: ErrorLevelFn;
    critical: ErrorLevelFn;
    error: ErrorLevelFn;
    warn: LevelFn;
    notice: LevelFn;
    info: LevelFn;
    debug: LevelFn;
    metrics: () => LoggerMetrics;
}>;
