import { LogTransport, TransportParams } from './LogTransport';
import { Log } from '@models/Log.type';
import { Level } from '@models/Level.type';
import { requireConsole } from '@errors/TransportError/ConsoleTransportError';

/**
 * Transport that writes formatted logs to the host console.
 */
export class ConsoleTransport extends LogTransport {
    private readonly targetConsole: Console;

    /**
     * Create a console transport.
     * @param consoleTransportOptions Optional custom formatter or formatter options.
     * @throws ConsoleTransportError when the host console implementation is missing.
     */
    constructor(consoleTransportOptions?: TransportParams) {
        const globalConsole = (
            typeof console !== 'undefined' ? console : undefined
        ) as Console | undefined;
        const missingMethods =
            typeof globalConsole === 'object'
                ? (['error', 'warn', 'info', 'debug'] as const).filter(
                      (method) =>
                          typeof (globalConsole as any)[method] !== 'function',
                  )
                : ['error', 'warn', 'info', 'debug'];
        if (!globalConsole || missingMethods.length > 0) {
            requireConsole(ConsoleTransport, missingMethods);
        }
        super('console', consoleTransportOptions);
        this.targetConsole = globalConsole;
    }

    /**
     * Output the provided log through the appropriate console channel.
     * @param log Structured log entry to write.
     */
    protected performEmit(log: Log): void {
        const text = this.formatter.format(log);
        const consoleRef = this.targetConsole;

        switch (log.level) {
            case Level.emergency:
            case Level.alert:
            case Level.critical:
            case Level.error:
                consoleRef.error(text);
                break;
            case Level.warning:
                consoleRef.warn(text);
                break;
            case Level.notice:
            case Level.informational:
                consoleRef.info(text);
                break;
            case Level.debug:
                consoleRef.debug(text);
                break;
        }
    }
}
