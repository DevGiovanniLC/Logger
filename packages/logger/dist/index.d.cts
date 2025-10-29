declare enum Level {
    Emergency = 0,// System unusable
    Alert = 1,// Immediate action required
    Critical = 2,// Critical condition
    Error = 3,// Error condition
    Warning = 4,// Warning condition
    Notice = 5,// Significant but normal
    Informational = 6,// Informational
    Debug = 7
}

type Log = Readonly<{
    id: number;
    level: Level;
    subject: string;
    message: string;
    timeStamp: number;
}>;

type ContextLogger = Readonly<{
    emergency: (message: string) => Log;
    alert: (message: string) => Log;
    critical: (message: string) => Log;
    error: (message: string) => Log;
    warn: (message: string) => Log;
    notice: (message: string) => Log;
    info: (message: string) => Log;
    debug: (message: string) => Log;
}>;

interface Transport {
    log(log: Log): void;
}

type DispatcherMode = 'sync' | 'reactive';

/**
 * Configuration options for the Logger.
 * - `minLevel`: logs with a level greater than this will be ignored.
 * - `transports`: output destinations that handle emitted logs.
 * - `dispatcher`: set dispatcher mode.
*/
type LoggerOptions = Readonly<{
    minLevel: Level;
    transports: Transport[];
    dispatcher: DispatcherMode;
}>;
/**
 * Transport-based logger using RFC 5424 levels (0–7).
 * Dispatching is delegated to a pluggable dispatcher.
 */
declare class Logger {
    private readonly options;
    private readonly dispatcher;
    /** Sequential log ID counter. */
    private counterID;
    /**
     * Creates a new Logger instance.
     * @param options Optional configuration.
     * Defaults: minLevel=Debug, transports=[ConsoleTransport], dispatcher='sync'.
     */
    constructor(options?: LoggerOptions);
    /**
     * Creates a contextual logger tied to a class name or custom string.
     * Each call returns an immutable object with the same log-level API.
     * @param ctx Object or string representing the log context.
     * @returns A frozen `ContextLogger` with contextualized output.
     */
    for(ctx: object | string): ContextLogger;
    /**
     * Level 0 - Emergency: System is unusable. (Catastrophic failure, data loss)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    emergency(subject: string, message: string): Log;
    /**
     * Level 1 - Alert: Immediate action required. (Critical security or system failure)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    alert(subject: string, message: string): Log;
    /**
     * Level 2 - Critical: Critical condition. (Core component failure)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    critical(subject: string, message: string): Log;
    /**
     * Level 3 - Error: Error condition. (Exception or failed operation)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    error(subject: string, message: string): Log;
    /**
     * Level 4 - Warning: Potential risk or degradation.
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    warn(subject: string, message: string): Log;
    /**
     * Level 5 - Notice: Significant but normal event. (Configuration change, startup, shutdown)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    notice(subject: string, message: string): Log;
    /**
     * Level 6 - Informational: General informational message.
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    info(subject: string, message: string): Log;
    /**
     * Level 7 - Debug: Detailed debug information. (Development diagnostics)
     * @param subject Log subject or category.
     * @param message Detailed event description.
     * @returns Created log object.
     */
    debug(subject: string, message: string): Log;
    /**
     * Builds an immutable log object with metadata.
     * @param level Severity level.
     * @param subject Log subject or category.
     * @param message Detailed message text.
     * @returns Log object ready to emit.
     */
    private build;
    /**
     * Sends the log to the dispatcher.
     * @param level Log severity.
     * @param subject Log subject or category.
     * @param message Log content.
     * @returns The emitted `Log` object.
     */
    private emit;
}

export { Level, type Log, Logger, type LoggerOptions };
