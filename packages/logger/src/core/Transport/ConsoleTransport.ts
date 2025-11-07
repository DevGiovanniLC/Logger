import { ConsoleFormatterParams, DefaultConsoleFormatter } from "@core/Formatter/DefaultConsoleFormatter"
import { LogFormatter } from "@core/Formatter/LogFormatter"
import { LogTransport } from "./LogTransport"
import { Log } from "@models/Log.type"
import { Level } from "@models/Level.type"


/**
 * Configuration for {@link ConsoleTransport}.
 */
type ConsoleTransportParams = {
    formatter?: LogFormatter
    defaultFormaterOptions?: ConsoleFormatterParams
}

/**
 * Transport that writes formatted logs to the host console.
 */
export class ConsoleTransport extends LogTransport {
    private readonly ConsoleFormatter: LogFormatter

    /**
     * Create a console transport.
     * @param consoleTransportOptions Optional custom formatter or formatter options.
     */
    constructor(consoleTransportOptions?: ConsoleTransportParams
    ) {
        super("console");
        this.ConsoleFormatter = consoleTransportOptions?.formatter ?? new DefaultConsoleFormatter(consoleTransportOptions?.defaultFormaterOptions)
    }

    /**
     * Output the provided log through the appropriate console channel.
     * @param log Structured log entry to write.
     */
    protected performEmit(log: Log): void {
        const text = this.ConsoleFormatter.format(log);

        switch (log.level) {
            case Level.Emergency:
            case Level.Alert:
            case Level.Critical:
            case Level.Error:
                console.error(text);
                break;
            case Level.Warning:
                console.warn(text);
                break;
            case Level.Notice:
            case Level.Informational:
                console.info(text);
                break;
            case Level.Debug:
                console.debug(text);
                break;
        }
    }
}
