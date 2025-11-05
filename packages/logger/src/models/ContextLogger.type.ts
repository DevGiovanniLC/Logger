import { ErrorBuilder } from "@helpers/ErrorHandler";
import { LoggerMetrics } from "./Metrics.type";
import { Log } from "./Log.type";


export type LevelFn = (message: unknown) => Log;

export type ErrorLevelFn = LevelFn & {
    (error: Error): never;
    <E extends Error>(builder: ErrorBuilder<E>, message?: unknown, options?: ErrorOptions): never;
};

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
