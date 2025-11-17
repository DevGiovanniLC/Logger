import { LogDispatcher } from "@core/Dispatcher/LogDispatcher";
import { DISPATCHER_FACTORIES, DispatcherMode, normalizeDispatcher } from "@core/Dispatcher/DispatcherRegistry";
import { ERROR_LEVEL_ENTRIES, ErrorLevelKey, INFO_LEVEL_ENTRIES, InfoLevelKey, Level } from "@models/Level.type";
import { ContextLogger } from "@models/ContextLogger.type";
import { Log } from "@models/Log.type";
import { buildError, captureStack, ErrorBuilder, isErrorBuilder } from "@helpers/ErrorHandler";
import { TransportParam, TransportResolver } from "@helpers/TransportResolver";
import { normalizeMessage, resolveSubject } from "@utils/MessageNormalizer";
import { LoggerMetrics, MetricsCollector, MetricsKey, MetricsOptions, MutableMetrics, ZERO_METRICS } from "@models/Metrics.type";
import { requireMetrics } from "@errors/LoggerError";



const DEFAULT_TRANSPORTS: TransportParam = ["console"];

/**
 * Configuration options accepted by the {@link Logger} constructor.
 */
type LoggerOptions = Readonly<{
    minLevel?: Level;
    transports?: TransportParam;
    dispatcher?: DispatcherMode;
    metrics?: MetricsOptions | boolean;
}>;

/**
 * Primary logging facade that formats, filters, and dispatches log entries.
 * Use {@link Logger.for} to obtain a contextual logger bound to a subject.
 */
export class Logger {
    private readonly dispatcher: LogDispatcher;
    private readonly hasTransport: boolean;
    private readonly isMetricsEnabled: boolean
    private readonly callback: Function
    private readonly metricsState?: MutableMetrics;
    private readonly metricsCollector?: MetricsCollector;

    private counterID = 0;

    /**
     * Create a new {@link Logger} instance.
     * @param options Optional customization for transports, minimum level, dispatcher mode, and metrics.
     */
    constructor(readonly options?: LoggerOptions) {
        const minLevel = options?.minLevel ?? Level.debug;
        const transports = TransportResolver.resolve(options?.transports ?? DEFAULT_TRANSPORTS);

        this.hasTransport = transports.length > 0;

        const metricsOptions = options?.metrics;

        this.isMetricsEnabled = (typeof metricsOptions !== "boolean" && metricsOptions?.enabled || typeof metricsOptions === "boolean" && metricsOptions)
        this.callback = typeof metricsOptions !== "boolean" ? metricsOptions?.onUpdate : undefined

        this.metricsState = { built: 0, dispatched: 0, filtered: 0, transportErrors: 0 };
        this.metricsCollector = {
            recordBuilt: () => this.recordMetric("built"),
            recordDispatched: () => this.recordMetric("dispatched"),
            recordFiltered: () => this.recordMetric("filtered"),
            recordTransportError: () => this.recordMetric("transportErrors"),
        };


        const dispatcherKey = normalizeDispatcher(options?.dispatcher);
        this.dispatcher = DISPATCHER_FACTORIES[dispatcherKey](transports, minLevel, this.metricsCollector);
    }

    /**
     * Snapshot of the currently collected metrics.
     */
    get metrics(): LoggerMetrics {
        if (this.isMetricsEnabled) {
            return this.snapshotMetrics();
        }
        requireMetrics(this)
    }

    /**
     * Create a contextual logger bound to a specific subject.
     * @param ctx Object or string used to derive the log subject.
     */
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
        return this.handleErrorLevel(Level.emergency, subject, input, message, opt, Logger.prototype.emergency);
    }

    /**
     * Level 1 - Alert: Immediate action required. (Critical security or system failure)
     */
    alert(subject: string, message: unknown): Log;
    alert(subject: string, error: Error): never;
    alert<E extends Error>(subject: string, builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    alert(subject: string, input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.handleErrorLevel(Level.alert, subject, input, message, opt, Logger.prototype.alert);
    }

    /**
     * Level 2 - Critical: Critical condition. (Core component failure)
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
        return this.handleErrorLevel(Level.critical, subject, input, message, opt, Logger.prototype.critical);
    }

    /**
     * Level 3 - Error: Error condition. (Exception or failed operation)
     */
    error(subject: string, message: unknown): Log;
    error(subject: string, error: Error): never;
    error<E extends Error>(subject: string, builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    error(subject: string, input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.handleErrorLevel(Level.error, subject, input, message, opt, Logger.prototype.error);
    }

    /**
     * Level 4 - Warning: Potential risk or degradation.
     */
    warn(subject: string, message: unknown): Log {
        return this.emit(Level.warning, subject, message);
    }

    /**
     * Level 5 - Notice: Significant but normal event. (Configuration change, startup, shutdown)
     */
    notice(subject: string, message: unknown): Log {
        return this.emit(Level.notice, subject, message);
    }

    /**
     * Level 6 - Informational: General informational message.
     */
    info(subject: string, message: unknown): Log {
        return this.emit(Level.informational, subject, message);
    }

    /**
     * Level 7 - Debug: Detailed debug information. (Development diagnostics)
     */
    debug(subject: string, message: unknown): Log {
        return this.emit(Level.debug, subject, message);
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


    /**
     * Build and dispatch a log entry when transports are configured.
     * @param level Severity associated with the message.
     * @param subject Contextual subject used as log namespace.
     * @param message Arbitrary payload that will be normalized into text.
     * @returns The materialized {@link Log} entry, regardless of dispatch.
     */
    private emit(level: Level, subject: string, message: unknown): Log {
        this.metricsCollector?.recordBuilt();
        const log = this.build(level, subject, normalizeMessage(message));
        if (!this.hasTransport) return log;
        this.dispatcher.dispatch(log);
        return log;
    }

    /**
     * Increment a metrics counter and notify listeners when configured.
     * @param key Metric identifier to increment.
     * @remarks {@link MetricsOptions.onUpdate} runs once per increment, so emitting a single log
     * usually triggers two notifications (one for `built`, another for the final outcome).
     */
    private recordMetric(key: MetricsKey): void {
        if (!this.metricsState) return;
        this.metricsState[key] += 1;
        const callback = this.callback
        if (callback) callback(this.snapshotMetrics());
    }

    /**
     * Produce an immutable snapshot of the current metrics state.
     * @returns A read-only view with the counters collected so far.
     */
    private snapshotMetrics(): LoggerMetrics {
        if (!this.metricsState) return ZERO_METRICS;
        const { built, dispatched, filtered, transportErrors } = this.metricsState;
        return { built, dispatched, filtered, transportErrors };
    }

    /**
     * Build an immutable contextual logger facade for a fixed subject.
     * @param subject Subject associated with all generated logs.
     * @returns A {@link ContextLogger} exposing level-specific helpers.
     */
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

    /**
     * Create a contextual error handler for a given severity level.
     * @param level Severity to emit when handling messages or errors.
     * @param subject Bound log subject.
     * @returns A function matching {@link ContextLogger.emergency} signature.
     */
    private createErrorHandler(level: Level, subject: string): ContextLogger["emergency"] {
        const handler = ((input: unknown, maybeMessage?: unknown, maybeOptions?: ErrorOptions) =>
            this.handleErrorLevel(level, subject, input, maybeMessage, maybeOptions, handler)
        ) as ContextLogger["emergency"];

        return handler;
    }

    /**
     * Handle dispatching of error-level logs including error normalization.
     * @param level Severity associated with the handler.
     * @param subject Contextual subject name.
     * @param input Message, {@link Error}, or {@link ErrorBuilder} to process.
     * @param message Optional supplemental message.
     * @param opt Additional {@link ErrorOptions} forwarded to the builder.
     * @param stackContext Optional function used as the stack trace boundary.
     * @returns The emitted {@link Log} when no error is thrown.
     * @throws Error When the input resolves to an {@link Error}.
     */
    private handleErrorLevel(
        level: Level,
        subject: string,
        input: unknown,
        message?: unknown,
        opt?: ErrorOptions,
        stackContext?: Function
    ): Log | never {
        if (input instanceof Error) {
            captureStack(input, stackContext);
            throw input;
        }

        if (isErrorBuilder(input)) {
            const normalizedMessage = message === undefined ? undefined : normalizeMessage(message);
            const err = buildError(subject, input, normalizedMessage, opt);
            captureStack(err, stackContext);
            throw err;
        }

        return this.emit(level, subject, input);
    }

}

/**
 * Application-level singleton helper built on top of {@link Logger}.
 * Useful for simple setups where a shared instance is sufficient.
 */
export class AppLogger {
    protected static _instance?: ContextLogger;
    protected static _logger?: Logger;
    protected static _options?: LoggerOptions;

    /**
     * Obtain a contextual logger for the provided subject.
     * When options are supplied, a dedicated {@link Logger} instance is created.
     * @param subject String or object used to derive the subject.
     * @param opts Optional one-off configuration.
     * @returns A contextual logger bound to the requested subject.
     */
    static for(subject: string | object, opts?: LoggerOptions): ContextLogger {
        if (opts) return new Logger(opts).for(subject);
        return this.ensureLogger().for(subject);
    }

    /**
     * Initialize the shared {@link Logger} instance used by the facade.
     * @param opts Global configuration reused by {@link instance}.
     */
    static init(opts?: LoggerOptions) {
        this._options = opts;
        this._logger = new Logger(opts);
        this._instance = this._logger.for("APP");
    }

    /**
     * Reset the shared singleton state, discarding cached logger, context, and options.
     * Useful for tests or scenarios that require a clean initialization cycle.
     */
    static reset(): void {
        this._options = undefined;
        this._logger = undefined;
        this._instance = undefined;
    }

    /**
     * Lazily create or return the shared contextual logger named "APP".
     * @returns The contextual logger backing the static helpers.
     */
    static get instance(): ContextLogger {
        if (this._instance) return this._instance;
        return (this._instance = this.ensureLogger().for("APP"));
    }

    /**
     * Emit or throw an emergency-level log using the shared logger.
     * @returns The created log when no error is thrown.
     */
    static emergency(message: unknown): Log;
    static emergency(error: Error): never;
    static emergency<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static emergency(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.forwardErrorLevel("emergency", input, message, opt);
    }

    /**
     * Emit or throw an alert-level log using the shared logger.
     * @returns The created log when no error is thrown.
     */
    static alert(message: unknown): Log;
    static alert(error: Error): never;
    static alert<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static alert(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.forwardErrorLevel("alert", input, message, opt);
    }

    /**
     * Emit or throw a critical-level log using the shared logger.
     * @returns The created log when no error is thrown.
     */
    static critical(message: unknown): Log;
    static critical(error: Error): never;
    static critical<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static critical(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.forwardErrorLevel("critical", input, message, opt);
    }

    /**
     * Emit or throw an error-level log using the shared logger.
     * @returns The created log when no error is thrown.
     */
    static error(message: unknown): Log;
    static error(error: Error): never;
    static error<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static error(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return this.forwardErrorLevel("error", input, message, opt);
    }

    /**
     * Emit a warning-level log using the shared logger.
     * @returns The created log.
     */
    static warn(message: unknown): Log {
        return this.forwardLevel("warn", message);
    }

    /**
     * Emit a notice-level log using the shared logger.
     * @returns The created log.
     */
    static notice(message: unknown): Log {
        return this.forwardLevel("notice", message);
    }

    /**
     * Emit an informational-level log using the shared logger.
     * @returns The created log.
     */
    static info(message: unknown): Log {
        return this.forwardLevel("info", message);
    }

    /**
     * Emit a debug-level log using the shared logger.
     * @returns The created log.
     */
    static debug(message: unknown): Log {
        return this.forwardLevel("debug", message);
    }

    /**
     * Expose the live metrics snapshot of the shared logger.
     * @returns Immutable metrics collected by the shared logger.
     */
    static get metrics(): LoggerMetrics | never {
        return this.ensureLogger().metrics;
    }

    /**
     * Forward error-level invocations to the contextual logger instance.
     * @returns The log emitted by the contextual handler.
     */
    private static forwardErrorLevel(
        key: ErrorLevelKey,
        input: unknown,
        message?: unknown,
        opt?: ErrorOptions
    ): Log | never {
        const handler = this.instance[key] as ContextLogger[ErrorLevelKey];
        return (handler as any)(input, message, opt);
    }

    /**
     * Forward info-level invocations to the contextual logger instance.
     * @returns The log emitted by the contextual handler.
     */
    private static forwardLevel(key: InfoLevelKey, message: unknown): Log {
        return this.instance[key](message);
    }

    /**
     * Ensure the internal singleton logger is available.
     * @throws Error when {@link init} was not invoked prior to usage.
     * @returns Initialized {@link Logger} instance.
     */
    private static ensureLogger(): Logger {
        if (this._logger) return this._logger;
        if (!this._options) throw new Error("AppLogger.init() requested");
        this._logger = new Logger(this._options);
        this._instance = this._logger.for("APP");
        return this._logger;
    }
}
