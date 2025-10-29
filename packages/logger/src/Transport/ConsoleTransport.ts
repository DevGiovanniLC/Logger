import { Level } from "../types/Level.type";
import { Log } from "../types/Log.type";
import { Transport } from "./Transport";

const supportsUnicode = (): boolean => {
    // Browser detection
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
        const ua = navigator.userAgent.toLowerCase();
        return !/windows nt [0-6]\./.test(ua);
    }

    // Node.js detection
    if (typeof process !== "undefined" && process.stdout) {
        const term = process.env["TERM"] || "";
        const termProgram = process.env["TERM_PROGRAM"] || "";
        return (
            process.platform !== "win32" ||
            term.includes("xterm") ||
            termProgram.includes("vscode") ||
            termProgram.includes("windows terminal")
        );
    }

    return true;
}

export const titleLog = supportsUnicode()
    ? [
        '🆘 EMERGENCY',
        '🚨 ALERT',
        '🔴 CRITICAL',
        '❌ ERROR',
        '⚠️ WARN',
        '🟡 NOTICE',
        'ℹ️ INFO',
        '🐞 DEBUG',
    ] as const
    : [
        '[!] EMERGENCY',
        '[!] ALERT',
        '[!] CRITICAL',
        '[X] ERROR',
        '[!] WARN',
        '[i] NOTICE',
        '[i] INFO',
        'DEBUG',
    ] as const;

export const FMT = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'medium' });

export class ConsoleTransport implements Transport {
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
        return `${id} — ${titleLog[log.level]} (${log.subject}) — ${log.message} — ${FMT.format(log.timeStamp)}`;
    }
}
