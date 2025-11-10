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
            case Level.emergency:
            case Level.alert:
            case Level.critical:
            case Level.error:
                console.error(text);
                break;
            case Level.warning:
                console.warn(text);
                break;
            case Level.notice:
            case Level.informational:
                console.info(text);
                break;
            case Level.debug:
                console.debug(text);
                break;
        }
    }
}
