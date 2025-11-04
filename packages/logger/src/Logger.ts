import { buildError, ErrorBuilder } from "./helpers/Error";
import { ContextLogger } from "./types/ContextLogger.type";
import { Level } from "./types/Level.type";
import { Log } from "./types/Log.type";
import { DispatcherMode, LogDispatcher } from "./Dispatcher/LogDispatcher";
import { SyncDispatcher } from "./Dispatcher/SyncDispatcher";
import { ReactiveDispatcher } from "./Dispatcher/ReactiveDispatcher";
import { TransportParam, TransportResolver } from "./helpers/TransportResolver";

/**
 * Configuration options for the Logger.
 * - `minLevel`: logs with a level greater than this will be ignored.
 * - `transports`: output destinations that handle emitted logs.
 * - `dispatcher`: set dispatcher mode.
*/
export type LoggerOptions = Readonly<{
    minLevel?: Level;
    transports?: TransportParam
    dispatcher?: DispatcherMode;
}>;

/**
 * Transport-based logger using RFC 5424 levels (0–7).
 * Dispatching is delegated to a pluggable dispatcher.
 */
export class Logger {
    private readonly dispatcher: LogDispatcher

    /** Sequential log ID counter. */
    private counterID = 0;

    private hasTransport = false

    /**
     * Creates a new Logger instance.
     * @param options Optional configuration.
     * Defaults: minLevel=Debug, transports=[ConsoleTransport], dispatcher='sync'.
     */
    constructor(readonly options?: LoggerOptions) {

        const minLevel = this.options?.minLevel ?? Level.Debug;
        const dispatcherOption = (this.options?.dispatcher ?? "Sync").toString();
        const dispatcher = dispatcherOption.toLowerCase();
        const transportList = TransportResolver.resolve(options?.transports ?? ['console'])

        if (transportList.length > 0) this.hasTransport = true

        switch (dispatcher) {
            case "sync":
                this.dispatcher = new SyncDispatcher(transportList, minLevel)
                break;
            case "reactive":
                this.dispatcher = new ReactiveDispatcher(transportList, minLevel)
                break;
            default:
                throw new Error(`Unsupported dispatcher mode "${dispatcherOption}". Expected "sync" or "reactive".`)
        }
    }

    /**
     * Creates a contextual logger tied to a class name or custom string.
     * Each call returns an immutable object with the same log-level API.
     * @param ctx Object or string representing the log context.
     * @returns A frozen `ContextLogger` with contextualized output.
     */
    for(ctx: object | string): ContextLogger {
        const subject = typeof ctx === 'string' ? ctx : (ctx?.constructor?.name ?? 'Unknown');

        const makeErrorLevel = (level: Level): ContextLogger["emergency"] => {
            const handler = ((input: unknown, maybeMessage?: unknown, maybeOptions?: ErrorOptions) =>
                this.handleErrorLevel(level, subject, input, maybeMessage, maybeOptions, handler)
            ) as ContextLogger["emergency"];

            return handler;
        };

        const makeLevel = (level: Level) => {
            return (message: unknown) => this.emit(level, subject, message);
        };

        return Object.freeze({
            emergency: makeErrorLevel(Level.Emergency),
            alert: makeErrorLevel(Level.Alert),
            critical: makeErrorLevel(Level.Critical),
            error: makeErrorLevel(Level.Error),
            warn: makeLevel(Level.Warning),
            notice: makeLevel(Level.Notice),
            info: makeLevel(Level.Informational),
            debug: makeLevel(Level.Debug),
        });
    }

    /**
     * Level 0 - Emergency: System is unusable. (Catastrophic failure, data loss)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    emergency(subject: string, message: unknown): Log;
    emergency(subject: string, error: Error): never;
    emergency<E extends Error>(subject: string, builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
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
    critical<E extends Error>(subject: string, builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
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
    warn(subject: string, message: unknown): Log { return this.emit(Level.Warning, subject, message); }

    /**
     * Level 5 - Notice: Significant but normal event. (Configuration change, startup, shutdown)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    notice(subject: string, message: unknown): Log { return this.emit(Level.Notice, subject, message); }

    /**
     * Level 6 - Informational: General informational message.
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    info(subject: string, message: unknown): Log { return this.emit(Level.Informational, subject, message); }

    /**
     * Level 7 - Debug: Detailed debug information. (Development diagnostics)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    debug(subject: string, message: unknown): Log { return this.emit(Level.Debug, subject, message); }

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
     * Sends the log to the dispatcher if exist transports.
     * @param level Log severity.
     * @param subject Log subject or category.
     * @param message Log content.
     * @returns Log
     */
    private emit(level: Level, subject: string, message: unknown): Log {
        const log = this.build(level, subject, this.normalizeMessage(message));
        if (!this.hasTransport) return log
        this.dispatcher.dispatch(log)
        return log;
    }

    private handleErrorLevel<E extends Error>(
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
            const normalizedMessage = message === undefined ? undefined : this.normalizeMessage(message);
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

    private normalizeMessage(message: unknown): string {
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
            return this.stringifyObject(message);
        }
        return String(message);
    }

    private stringifyObject(value: object): string {
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
}


export class AppLogger {
    private static _instance?: ContextLogger
    private static _logger?: Logger
    private static _options?: LoggerOptions

    static for(subject: string | object, opts?: LoggerOptions): ContextLogger {
        if (opts) return new Logger(opts).for(subject)
        return this.ensureLogger().for(subject)
    }

    static init(opts?: LoggerOptions) {
        this._options = opts
        this._logger = new Logger(opts)
        this._instance = this._logger.for('APP')
    }

    static get instance(): ContextLogger {
        if (this._instance) return this._instance
        return (this._instance = this.ensureLogger().for('APP'))
    }

    static emergency(message: unknown): Log;
    static emergency(error: Error): never;
    static emergency<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static emergency(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return (this.instance.emergency as any)(input, message, opt);
    }

    static alert(message: unknown): Log;
    static alert(error: Error): never;
    static alert<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static alert(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return (this.instance.alert as any)(input, message, opt);
    }

    static critical(message: unknown): Log;
    static critical(error: Error): never;
    static critical<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static critical(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return (this.instance.critical as any)(input, message, opt);
    }

    static error(message: unknown): Log;
    static error(error: Error): never;
    static error<E extends Error>(builder: ErrorBuilder<E>, message?: unknown, opt?: ErrorOptions): never;
    static error(input: unknown, message?: unknown, opt?: ErrorOptions): Log | never {
        return (this.instance.error as any)(input, message, opt);
    }

    static warn(message: unknown) {
        return this.instance.warn(message)
    }

    static notice(message: unknown) {
        return this.instance.notice(message)
    }

    static info(message: unknown) {
        return this.instance.info(message)
    }

    static debug(message: unknown) {
        return this.instance.debug(message)
    }

    private static ensureLogger(): Logger {
        if (this._logger) return this._logger
        if (!this._options) throw new Error('AppLogger.init() requested')
        this._logger = new Logger(this._options)
        this._instance = this._logger.for('APP')
        return this._logger
    }
}
