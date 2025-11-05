import { ConsoleFormatterParams, DefaultConsoleFormatter } from "@core/Formatter/DefaultConsoleFormatter"
import { LogFormatter } from "@core/Formatter/LogFormatter"
import { LogTransport } from "./LogTransport"
import { Log } from "@models/Log.type"
import { Level } from "@models/Level.type"


type ConsoleTransportParams = {
    formatter?: LogFormatter
    defaultFormaterOptions?: ConsoleFormatterParams
}

export class ConsoleTransport implements LogTransport {
    private readonly ConsoleFormatter: LogFormatter

    constructor(consoleTransportOptions?: ConsoleTransportParams
    ) {
        this.ConsoleFormatter = consoleTransportOptions?.formatter ?? new DefaultConsoleFormatter(consoleTransportOptions?.defaultFormaterOptions)
    }

    log(log: Log): void {
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
