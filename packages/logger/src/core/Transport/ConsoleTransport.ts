import { LogTransport, TransportParams } from "./LogTransport"
import { Log } from "@models/Log.type"
import { Level } from "@models/Level.type"



/**
 * Transport that writes formatted logs to the host console.
 */
export class ConsoleTransport extends LogTransport {

    /**
     * Create a console transport.
     * @param consoleTransportOptions Optional custom formatter or formatter options.
     */
    constructor(consoleTransportOptions?: TransportParams
    ) {
        super("console", consoleTransportOptions);
    }

    /**
     * Output the provided log through the appropriate console channel.
     * @param log Structured log entry to write.
     */
    protected performEmit(log: Log): void {
        const text = this.formatter.format(log);

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
