import { LevelColor } from "../helpers/Colors";
import { Log } from "../types/Log.type";
import { LogFormatter } from "./LogFormatter";

type TitleInfo = Readonly<{
    icon: string;
    label: string;
}>;

const titleLog = (withEmojis: boolean): readonly TitleInfo[] => {
    return withEmojis
        ? [
            { icon: '\uD83C\uDD98', label: 'EMERGENCY' },           //🆘
            { icon: '\u{1F6A8}', label: 'ALERT' },                               //🚨
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
            { icon: '[•]', label: 'DEBUG' },
        ] as const;
};

export type ConsoleFormatterParams = {
    withEmojis?: boolean;
    localeDate?: Intl.LocalesArgument
    color?: boolean
};

export class DefaultConsoleFormatter implements LogFormatter {
    private dateFormatter

    constructor(
        private readonly formatterOptions: ConsoleFormatterParams = {
            localeDate: undefined,
            withEmojis: false,
            color: false
        }
    ) {
        this.dateFormatter = new Intl.DateTimeFormat(formatterOptions.localeDate, { dateStyle: 'short', timeStyle: 'medium' });
    }

    format(log: Log): string {
        const id = `#${String(log.id).padStart(5, '0')}`;
        const title = titleLog(this.formatterOptions.withEmojis ?? false)[log.level];
        return LevelColor[this.formatterOptions.color ? log.level : 8](
            `${id} - ${title.icon} ${title.label} (${log.subject}): ${log.message} - ${this.dateFormatter.format(log.timeStamp)}`
        );
    }
}
