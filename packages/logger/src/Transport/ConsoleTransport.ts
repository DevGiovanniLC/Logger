import { Level } from "../types/Level.type";
import { Log } from "../types/Log.type";
import { Transport } from "./Transport";

type TitleInfo = Readonly<{
    icon: string;
    label: string;
}>;

export const titleLog = (withEmojis: boolean): readonly TitleInfo[] => {
    return withEmojis
        ? [
            { icon: '\u{1F6A8}', label: 'EMERGENCY' },                    //🚨
            { icon: '\u{1F691}', label: 'ALERT' },                               //🚑
            { icon: '\u{1F525}', label: 'CRITICAL' },                          //🔥
            { icon: '\u{26D4}\u{FE0F}', label: 'ERROR' },                 //⛔️
            { icon: '\u{26A0}\u{FE0F} ‎', label: 'WARN' },  //⚠️
            { icon: '\u{1F4E2}', label: 'NOTICE' },                           // 📢
            { icon: '\u{2139}\u{FE0F} ‎', label: 'INFO' },    //ℹ️
            { icon: '\u{1F41E}', label: 'DEBUG' },                            //🐞
        ] as const
        : [
            { icon: '[!]', label: 'EMERGENCY' },
            { icon: '[!]', label: 'ALERT' },
            { icon: '[!]', label: 'CRITICAL' },
            { icon: '[X]', label: 'ERROR' },
            { icon: '[!]', label: 'WARN' },
            { icon: '[i]', label: 'NOTICE' },
            { icon: '[i]', label: 'INFO' },
            { icon: '[DBG]', label: 'DEBUG' },
        ] as const;
};

export const FMT = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'medium' });

export type ConsoleTransportOptions = {
    withEmojis: boolean;
};

export class ConsoleTransport implements Transport {

    constructor(
        private readonly options: ConsoleTransportOptions = {
            withEmojis: false,
        }
    ) { }

    log(log: Log): void {
        const text = this.format(log);

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
        const title = titleLog(this.options.withEmojis)[log.level];
        return `${id} - ${title.icon} ${title.label} (${log.subject}): ${log.message} - ${FMT.format(log.timeStamp)}`;
    }
}
