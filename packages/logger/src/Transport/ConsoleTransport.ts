import { Level } from "../types/Level.type";
import { Log } from "../types/Log.type";
import { Transport } from "./Transport";


export const titleLog = (withEmojis: boolean) => {
    return withEmojis ? [
        '🆘 EMERGENCY',
        '🚨 ALERT',
        '🔴 CRITICAL',
        '❌ ERROR',
        '⚠️ WARN',
        '🟡 NOTICE',
        'ℹ️ INFO',
        '🐞 DEBUG',
    ] as const :
        [
            '[!] EMERGENCY',
            '[!] ALERT',
            '[!] CRITICAL',
            '[X] ERROR',
            '[!] WARN',
            '[i] NOTICE',
            '[i] INFO',
            '[·] DEBUG',
        ] as const;
}


export const FMT = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'medium' });

export type ConsoleTransportOptions = {
    withEmojis: boolean
}

export class ConsoleTransport implements Transport {

    constructor(
        private readonly options: ConsoleTransportOptions = {
            withEmojis: false
        }
    ) { }

    log(log: Log): void {
        const text = this.format(log)

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

    private format(log: Log): string {
        const id = `#${String(log.id).padStart(5, '0')}`;
        const title = titleLog(this.options.withEmojis)
        return `${id} — ${title[log.level]} (${log.subject}):  ${log.message} — ${FMT.format(log.timeStamp)}`;
    }
}
