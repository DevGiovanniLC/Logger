import { DISPATCHER_FACTORIES, DispatcherMode, LogDispatcher, normalizeDispatcher } from "@core/Dispatcher/LogDispatcher";
import { ERROR_LEVEL_ENTRIES, ErrorLevelKey, INFO_LEVEL_ENTRIES, InfoLevelKey, Level } from "@models/Level.type";
import { ContextLogger } from "@models/ContextLogger.type";
import { Log } from "@models/Log.type";
import { buildError, ErrorBuilder } from "@helpers/ErrorHandler";
import { TransportParam, TransportResolver } from "@helpers/TransportResolver";
import { normalizeMessage, resolveSubject } from "@utils/MessageNormalizer";
import { LoggerMetrics, MetricsCollector, MetricsKey, MetricsOptions, MutableMetrics, ZERO_METRICS } from "@models/Metrics.type";


const DEFAULT_TRANSPORTS: TransportParam = ["console"];

type LoggerOptions = Readonly<{
    minLevel?: Level;
    transports?: TransportParam;
    dispatcher?: DispatcherMode;
    metrics?: MetricsOptions;
}>;

export class Logger {
    private readonly dispatcher: LogDispatcher;
    private readonly hasTransport: boolean;
    private readonly metricsOptions?: MetricsOptions;
    private readonly metricsState?: MutableMetrics;
    private readonly metricsCollector?: MetricsCollector;

    private counterID = 0;

    constructor(readonly options?: LoggerOptions) {
        const minLevel = options?.minLevel ?? Level.Debug;
        const transports = TransportResolver.resolve(options?.transports ?? DEFAULT_TRANSPORTS);

        this.hasTransport = transports.length > 0;

        const metricsOptions = options?.metrics;
        const metricsEnabled = metricsOptions?.enabled ?? !!metricsOptions?.onUpdate;
        if (metricsEnabled) {
            this.metricsOptions = metricsOptions;
            this.metricsState = { built: 0, dispatched: 0, filtered: 0, transportErrors: 0 };
            this.metricsCollector = {
                recordBuilt: () => this.recordMetric("built"),
                recordDispatched: () => this.recordMetric("dispatched"),
                recordFiltered: () => this.recordMetric("filtered"),
                recordTransportError: () => this.recordMetric("transportErrors"),
            };
        }

        const dispatcherKey = normalizeDispatcher(options?.dispatcher);
        this.dispatcher = DISPATCHER_FACTORIES[dispatcherKey](transports, minLevel, this.metricsCollector);
    }

    get metrics(): LoggerMetrics {
        return this.snapshotMetrics();
    }

    for(ctx: object | string): ContextLogger {
        const subject = resolveSubject(ctx);
        return this.createContextLogger(subject);
    }

    /**
     * Level 0 - Emergency: System is unusable. (Catastrophic failure, data loss)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    emergency(subject: string, message: unknown): Log;
    emergency(subject: string, error: Error): never;
    emergency<E extends Error>(
        subject: string,
        builder: ErrorBuilder<E>,
        message?: unknown,
        opt?: ErrorOptions
    ): never;
    emergency(subject: string, input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.handleErrorLevel(Level.Emergency, subject, input, message, opt, Logger.prototype.emergency);
    }

    /**
     * Level 1 - Alert: Immediate action required. (Critical security or system failure)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    alert(subject: string, message: unknown): Log;
    alert(subject: string, error: Error): never;
    alert<E extends Error>(subject: string, builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    alert(subject: string, input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.handleErrorLevel(Level.Alert, subject, input, message, opt, Logger.prototype.alert);
    }

    /**
     * Level 2 - Critical: Critical condition. (Core component failure)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    critical(subject: string, message: unknown): Log;
    critical(subject: string, error: Error): never;
    critical<E extends Error>(
        subject: string,
        builder: ErrorBuilder<E>,
        message?: unknown,
        opt?: ErrorOptions
    ): never;
    critical(subject: string, input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.handleErrorLevel(Level.Critical, subject, input, message, opt, Logger.prototype.critical);
    }

    /**
     * Level 3 - Error: Error condition. (Exception or failed operation)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    error(subject: string, message: unknown): Log;
    error(subject: string, error: Error): never;
    error<E extends Error>(subject: string, builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    error(subject: string, input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.handleErrorLevel(Level.Error, subject, input, message, opt, Logger.prototype.error);
    }

    /**
     * Level 4 - Warning: Potential risk or degradation.
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    warn(subject: string, message: unknown): Log {
        return this.emit(Level.Warning, subject, message);
    }

    /**
     * Level 5 - Notice: Significant but normal event. (Configuration change, startup, shutdown)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    notice(subject: string, message: unknown): Log {
        return this.emit(Level.Notice, subject, message);
    }

    /**
     * Level 6 - Informational: General informational message.
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    info(subject: string, message: unknown): Log {
        return this.emit(Level.Informational, subject, message);
    }

    /**
     * Level 7 - Debug: Detailed debug information. (Development diagnostics)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    debug(subject: string, message: unknown): Log {
        return this.emit(Level.Debug, subject, message);
    }

    /**
     * Builds an immutable log object with metadata.
     * @param level Severity level.
     * @param subject Log subject or category.
     * @param message Detailed message text.
     * @returns Log object ready to emit.
     */
    private build(level: Level, subject: string, message: string): Log {
        return { id: ++this.counterID, level, subject, message, timeStamp: Date.now() } as const;
    }


    private emit(level: Level, subject: string, message: unknown): Log {
        this.metricsCollector?.recordBuilt();
        const log = this.build(level, subject, normalizeMessage(message));
        if (!this.hasTransport) return log;
        this.dispatcher.dispatch(log);
        return log;
    }

    private recordMetric(key: MetricsKey): void {
        if (!this.metricsState) return;
        this.metricsState[key] += 1;
        const callback = this.metricsOptions?.onUpdate;
        if (callback) callback(this.snapshotMetrics());
    }

    private snapshotMetrics(): LoggerMetrics {
        if (!this.metricsState) return ZERO_METRICS;
        const { built, dispatched, filtered, transportErrors } = this.metricsState;
        return { built, dispatched, filtered, transportErrors };
    }

    private createContextLogger(subject: string): ContextLogger {
        const context: Record<string, unknown> = {};

        for (const [name, level] of ERROR_LEVEL_ENTRIES) {
            context[name] = this.createErrorHandler(level, subject);
        }

        for (const [name, level] of INFO_LEVEL_ENTRIES) {
            context[name] = (message: unknown) => this.emit(level, subject, message);
        }

        context.metrics = () => this.metrics;

        return Object.freeze(context) as ContextLogger;
    }

    private createErrorHandler(level: Level, subject: string): ContextLogger["emergency"] {
        const handler = ((input: unknown, maybeMessage?: unknown, maybeOptions?: ErrorOptions) =>
            this.handleErrorLevel(level, subject, input, maybeMessage, maybeOptions, handler)
        ) as ContextLogger["emergency"];

        return handler;
    }

    private handleErrorLevel(
        level: Level,
        subject: string,
        input: unknown,
        message?: unknown,
        opt?: ErrorOptions,
        stackContext?: Function
    ): Log | never {
        if (input instanceof Error) {
            this.captureStack(input, stackContext);
            throw input;
        }

        if (Logger.isErrorBuilder(input)) {
            const normalizedMessage = message === undefined ? undefined : normalizeMessage(message);
            const err = buildError(subject, input, normalizedMessage, opt);
            this.captureStack(err, stackContext);
            throw err;
        }

        return this.emit(level, subject, input);
    }

    private captureStack(error: Error, stackContext?: Function) {
        if (!stackContext) return;
        Error.captureStackTrace?.(error, stackContext);
    }

    private static isErrorBuilder(value: unknown): value is ErrorBuilder {
        if (typeof value !== "function") return false;
        const prototype = value.prototype;
        if (!prototype) return false;
        return prototype === Error.prototype || Error.prototype.isPrototypeOf(prototype);
    }
}

export class AppLogger {
    private static _instance?: ContextLogger;
    private static _logger?: Logger;
    private static _options?: LoggerOptions;

    static for(subject: string | object, opts?: LoggerOptions): ContextLogger {
        if (opts) return new Logger(opts).for(subject);
        return this.ensureLogger().for(subject);
    }

    static init(opts?: LoggerOptions) {
        this._options = opts;
        this._logger = new Logger(opts);
        this._instance = this._logger.for("APP");
    }

    static get instance(): ContextLogger {
        if (this._instance) return this._instance;
        return (this._instance = this.ensureLogger().for("APP"));
    }

    static emergency(message: unknown): Log;
    static emergency(error: Error): never;
    static emergency<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static emergency(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.forwardErrorLevel("emergency", input, message, opt);
    }

    static alert(message: unknown): Log;
    static alert(error: Error): never;
    static alert<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static alert(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.forwardErrorLevel("alert", input, message, opt);
    }

    static critical(message: unknown): Log;
    static critical(error: Error): never;
    static critical<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static critical(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.forwardErrorLevel("critical", input, message, opt);
    }

    static error(message: unknown): Log;
    static error(error: Error): never;
    static error<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static error(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.forwardErrorLevel("error", input, message, opt);
    }

    static warn(message: unknown): Log {
        return this.forwardLevel("warn", message);
    }

    static notice(message: unknown): Log {
        return this.forwardLevel("notice", message);
    }

    static info(message: unknown): Log {
        return this.forwardLevel("info", message);
    }

    static debug(message: unknown): Log {
        return this.forwardLevel("debug", message);
    }

    static get metrics(): LoggerMetrics {
        return this.ensureLogger().metrics;
    }

    private static forwardErrorLevel(
        key: ErrorLevelKey,
        input: unknown,
        message?: unknown,
        opt?: ErrorOptions
    ): Log | never {
        const handler = this.instance[key] as ContextLogger[ErrorLevelKey];
        return (handler as any)(input, message, opt);
    }

    private static forwardLevel(key: InfoLevelKey, message: unknown): Log {
        return this.instance[key](message);
    }

    private static ensureLogger(): Logger {
        if (this._logger) return this._logger;
        if (!this._options) throw new Error("AppLogger.init() requested");
        this._logger = new Logger(this._options);
        this._instance = this._logger.for("APP");
        return this._logger;
    }
}
