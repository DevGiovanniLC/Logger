import { ContextLogger } from "./types/ContextLogger.type";
import { Level } from "./types/Level.type";
import { Log } from "./types/Log.type";
import { Transport, TransportMode } from "./Transport/Transport";
import { ConsoleTransport } from "./Transport/ConsoleTransport";
import { DispatcherMode, LogDispatcher } from "./Dispatcher/LogDispatcher";
import { SyncDispatcher } from "./Dispatcher/SyncDispatcher";
import { ReactiveDispatcher } from "./Dispatcher/ReactiveDispatcher";

/**
 * Configuration options for the Logger.
 * - `minLevel`: logs with a level greater than this will be ignored.
 * - `transports`: output destinations that handle emitted logs.
 * - `dispatcher`: set dispatcher mode.
*/
export type LoggerOptions = Readonly<{
    minLevel?: Level;
    transports?: Array<TransportMode | Transport>
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
        const dispatcher = this.options?.dispatcher ?? 'Sync';
        const transportList = this.updateTransportList(options?.transports ?? ['Console'])

        if (transportList.length > 0) this.hasTransport = true

        switch (dispatcher) {
            case "Sync":
                this.dispatcher = new SyncDispatcher(transportList, minLevel)
                break;
            case "Reactive":
                this.dispatcher = new ReactiveDispatcher(transportList, minLevel)
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
        const emit = (level: Level, message: string) => this.emit(level, subject, message);

        return Object.freeze({
            emergency: (m: string) => emit(Level.Emergency, m),
            alert: (m: string) => emit(Level.Alert, m),
            critical: (m: string) => emit(Level.Critical, m),
            error: (m: string) => emit(Level.Error, m),
            warn: (m: string) => emit(Level.Warning, m),
            notice: (m: string) => emit(Level.Notice, m),
            info: (m: string) => emit(Level.Informational, m),
            debug: (m: string) => emit(Level.Debug, m),
        });
    }

    /**
     * Level 0 - Emergency: System is unusable. (Catastrophic failure, data loss)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    emergency(subject: string, message: string): Log { return this.emit(Level.Emergency, subject, message); }

    /**
     * Level 1 - Alert: Immediate action required. (Critical security or system failure)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    alert(subject: string, message: string): Log { return this.emit(Level.Alert, subject, message); }

    /**
     * Level 2 - Critical: Critical condition. (Core component failure)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    critical(subject: string, message: string): Log { return this.emit(Level.Critical, subject, message); }

    /**
     * Level 3 - Error: Error condition. (Exception or failed operation)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    error(subject: string, message: string): Log { return this.emit(Level.Error, subject, message); }

    /**
     * Level 4 - Warning: Potential risk or degradation.
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    warn(subject: string, message: string): Log { return this.emit(Level.Warning, subject, message); }

    /**
     * Level 5 - Notice: Significant but normal event. (Configuration change, startup, shutdown)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    notice(subject: string, message: string): Log { return this.emit(Level.Notice, subject, message); }

    /**
     * Level 6 - Informational: General informational message.
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    info(subject: string, message: string): Log { return this.emit(Level.Informational, subject, message); }

    /**
     * Level 7 - Debug: Detailed debug information. (Development diagnostics)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    debug(subject: string, message: string): Log { return this.emit(Level.Debug, subject, message); }

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
    private emit(level: Level, subject: string, message: string): Log {
        const log = this.build(level, subject, message);
        if (!this.hasTransport) return log
        this.dispatcher.dispatch(log)
        return log;
    }

    /**
     * Builds and updates the active list of transport instances based on the configured options.
     * @returns {Transport[]} A new array containing all resolved {@link Transport} instances ready to use.
     */
    private updateTransportList(transportOptions: Array<Transport | TransportMode>): Transport[] {
        const transports: Transport[] = transportOptions.filter(
            (transport) => typeof transport !== "string"
        );

        if (transportOptions.includes("Console"))
            transports.push(new ConsoleTransport());

        if (transportOptions.includes("ConsoleWithEmojis"))
            transports.push(new ConsoleTransport({ withEmojis: true }));

        return transports;
    }

}
