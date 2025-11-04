export const color = {
    // Colors
    black: (t: string) => `\x1b[30m${t}\x1b[0m`,
    red: (t: string) => `\x1b[31m${t}\x1b[0m`,
    green: (t: string) => `\x1b[32m${t}\x1b[0m`,
    yellow: (t: string) => `\x1b[33m${t}\x1b[0m`,
    blue: (t: string) => `\x1b[34m${t}\x1b[0m`,
    magenta: (t: string) => `\x1b[35m${t}\x1b[0m`,
    cyan: (t: string) => `\x1b[36m${t}\x1b[0m`,
    white: (t: string) => `\x1b[37m${t}\x1b[0m`,

    // Bright colors
    brightRed: (t: string) => `\x1b[91m${t}\x1b[0m`,
    brightGreen: (t: string) => `\x1b[92m${t}\x1b[0m`,
    brightYellow: (t: string) => `\x1b[93m${t}\x1b[0m`,
    brightBlue: (t: string) => `\x1b[94m${t}\x1b[0m`,
    brightMagenta: (t: string) => `\x1b[95m${t}\x1b[0m`,
    brightCyan: (t: string) => `\x1b[96m${t}\x1b[0m`,
    brightWhite: (t: string) => `\x1b[97m${t}\x1b[0m`,

    // styles
    bold: (t: string) => `\x1b[1m${t}\x1b[0m`,
    dim: (t: string) => `\x1b[2m${t}\x1b[0m`,
    italic: (t: string) => `\x1b[3m${t}\x1b[0m`,
    underline: (t: string) => `\x1b[4m${t}\x1b[0m`,
    inverse: (t: string) => `\x1b[7m${t}\x1b[0m`,
};

export const LevelColor = {
    0: (t: string) => color.bold(color.brightRed(t)),  // Emergency
    1: (t: string) => color.brightRed(t),              // Alert
    2: (t: string) => color.red(t),                    // Critical
    3: (t: string) => color.brightMagenta(t),          // Error
    4: (t: string) => color.yellow(t),                 // Warning
    5: (t: string) => color.brightYellow(t),           // Notice
    6: (t: string) => color.cyan(t),                   // Info
    7: (t: string) => color.italic(t),                    // Debug
    8: (t: string) => t,                    // No Styled

    emergency(t: string) { return this[0](t); },
    alert(t: string) { return this[1](t); },
    critical(t: string) { return this[2](t); },
    error(t: string) { return this[3](t); },
    warn(t: string) { return this[4](t); },
    notice(t: string) { return this[5](t); },
    info(t: string) { return this[6](t); },
    debug(t: string) { return this[7](t); },
};
