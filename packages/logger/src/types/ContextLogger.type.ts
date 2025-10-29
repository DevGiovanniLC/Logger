import { Log } from "./Log.type";

export type ContextLogger = Readonly<{
    emergency: (message: string) => Log;
    alert: (message: string) => Log;
    critical: (message: string) => Log;
    error: (message: string) => Log;
    warn: (message: string) => Log;
    notice: (message: string) => Log;
    info: (message: string) => Log;
    debug: (message: string) => Log;
}>;
