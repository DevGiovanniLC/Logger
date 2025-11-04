import { ErrorBuilder } from "../helpers/Error";
import { Log } from "./Log.type";


export type LevelFn = {
    (message: string): Log; // log
}

export type ErrorLevelFn = LevelFn & {
    (err: Error): never | Log; // throw
    <E extends Error>(Err: string | Error | ErrorBuilder<E>, msg?: string, opt?: ErrorOptions): never | Log; // throw
};


export type ContextLogger = Readonly<{
    emergency: ErrorLevelFn
    alert: ErrorLevelFn
    critical: ErrorLevelFn
    error: ErrorLevelFn
    warn: LevelFn
    notice: LevelFn
    info: LevelFn
    debug: LevelFn
}>;
