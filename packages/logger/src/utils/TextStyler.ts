type ColorFn = (text: string) => string;
type LevelIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const wrap = (code: number): ColorFn => (text: string) => `\x1b[${code}m${text}\x1b[0m`;

export const color = {
    // Colors
    black: wrap(30),
    red: wrap(31),
    green: wrap(32),
    yellow: wrap(33),
    blue: wrap(34),
    magenta: wrap(35),
    cyan: wrap(36),
    white: wrap(37),

    // Bright colors
    brightRed: wrap(91),
    brightGreen: wrap(92),
    brightYellow: wrap(93),
    brightBlue: wrap(94),
    brightMagenta: wrap(95),
    brightCyan: wrap(96),
    brightWhite: wrap(97),

    // Styles
    bold: wrap(1),
    dim: wrap(2),
    italic: wrap(3),
    underline: wrap(4),
    inverse: wrap(7),
} as const;

const identity: ColorFn = (text) => text;

const levelColorMap: Record<LevelIndex, ColorFn> = {
    0: (text) => color.bold(color.brightRed(text)),
    1: (text) => color.brightRed(text),
    2: (text) => color.red(text),
    3: (text) => color.brightMagenta(text),
    4: (text) => color.yellow(text),
    5: (text) => color.brightYellow(text),
    6: (text) => color.cyan(text),
    7: (text) => color.italic(text),
    8: identity,
};

type LevelColorMap = Record<LevelIndex, ColorFn> & {
    emergency: ColorFn;
    alert: ColorFn;
    critical: ColorFn;
    error: ColorFn;
    warn: ColorFn;
    notice: ColorFn;
    info: ColorFn;
    debug: ColorFn;
};

const levelColorObject: LevelColorMap = {
    ...levelColorMap,
    emergency: levelColorMap[0],
    alert: levelColorMap[1],
    critical: levelColorMap[2],
    error: levelColorMap[3],
    warn: levelColorMap[4],
    notice: levelColorMap[5],
    info: levelColorMap[6],
    debug: levelColorMap[7],
};

export const LevelColor: LevelColorMap = Object.freeze(levelColorObject) as LevelColorMap;
