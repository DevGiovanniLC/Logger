import { DefaultConsoleFormatter } from '../Formatter/DefaultConsoleFormatter';
import { ConsoleFormatterParams } from "../Formatter/DefaultConsoleFormatter";
import { Level } from "../types/Level.type";
import { Log } from "../types/Log.type";
import { LogTransport } from "./LogTransport";
import { LogFormatter } from '../Formatter/LogFormatter';

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
