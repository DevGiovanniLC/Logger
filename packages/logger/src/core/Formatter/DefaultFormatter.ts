import { Log } from '@models/Log.type';
import { LogFormatter } from './LogFormatter';
import { LevelColor } from '@utils/TextStyler';
import { requireDateFormatter } from '@errors/FormatterError/FormatterError';

/**
 * Descriptor used to build the formatted title for each severity level.
 */
type TitleInfo = Readonly<{
    icon: string;
    label: string;
}>;

const ASCII_TITLES: readonly TitleInfo[] = [
    { icon: '[!]', label: 'EMERGENCY' },
    { icon: '[!]', label: 'ALERT' },
    { icon: '[!]', label: 'CRITICAL' },
    { icon: '[X]', label: 'ERROR' },
    { icon: '[!]', label: 'WARN' },
    { icon: '[i]', label: 'NOTICE' },
    { icon: '[i]', label: 'INFO' },
    { icon: '[•]', label: 'DEBUG' },
] as const;

const EMOJI_TITLES: readonly TitleInfo[] = [
    { icon: '\u{1F198}', label: 'EMERGENCY' },
    { icon: '\u{1F6A8}', label: 'ALERT' },
    { icon: '\u{1F525}', label: 'CRITICAL' },
    { icon: '\u{26D4}\u{FE0F}', label: 'ERROR' },
    { icon: '\u{26A0}\u{FE0F} ‎', label: 'WARN' },
    { icon: '\u{1F4E3}', label: 'NOTICE' },
    { icon: '\u{2139}\u{FE0F} ‎', label: 'INFO' },
    { icon: '\u{1F41E}', label: 'DEBUG' },
] as const;

const TITLE_SETS = {
    true: EMOJI_TITLES,
    false: ASCII_TITLES,
} as const;

const DEFAULT_TITLE: TitleInfo = { icon: '', label: 'LOG' };
type LevelIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Options accepted by {@link DefaultFormatter}.
 */
export type FormatterParams = {
    withEmojis?: boolean;
    localeDate?: Intl.LocalesArgument;
    color?: boolean;
};

/**
 * Formatter tailored for console transports with optional color and emoji support.
 */
export class DefaultFormatter implements LogFormatter {
    private readonly dateFormatter: Intl.DateTimeFormat;
    private readonly useColor: boolean;
    private readonly titles: readonly TitleInfo[];

    /**
     * Create a formatter instance.
     * @param options Tuning parameters for emojis, localization, and color usage.
     * @throws FormatterError when Intl.DateTimeFormat cannot be instantiated.
     */
    constructor(options: FormatterParams = {}) {
        const withEmojis = options.withEmojis ?? false;
        this.useColor = options.color ?? false;
        const key: keyof typeof TITLE_SETS = withEmojis ? 'true' : 'false';
        this.titles = TITLE_SETS[key];
        try {
            this.dateFormatter = new Intl.DateTimeFormat(options.localeDate, {
                dateStyle: 'short',
                timeStyle: 'medium',
            });
        } catch (error) {
            requireDateFormatter(DefaultFormatter, options.localeDate, error);
        }
    }

    /**
     * Format a log entry into a console-friendly string.
     * @param log Structured log to format.
     * @returns Decorated line ready for output.
     */
    format(log: Log): string {
        const id = `#${String(log.id).padStart(5, '0')}`;
        const title = this.titles[log.level] ?? DEFAULT_TITLE;
        const decoratedTitle = title.icon
            ? `${title.icon} ${title.label}`
            : title.label;
        const timestamp = this.dateFormatter.format(log.timeStamp);
        const coloredHeader = this.colorize(log.level)(
            `${id} - ${decoratedTitle} (${log.subject}):`,
        );
        const header = `${coloredHeader}`;
        const body = `${log.message} - ${timestamp}`;
        return `${header} ${body}`;
    }

    /**
     * Resolve the colorizer function for the requested level.
     * @param level Severity index as stored on the log entry.
     * @returns Function that wraps text with ANSI color sequences.
     */
    private colorize(level: number): (text: string) => string {
        const index = (this.useColor ? level : 8) as LevelIndex;
        return LevelColor[index] ?? LevelColor[8];
    }
}
