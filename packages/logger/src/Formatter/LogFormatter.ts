import { Log } from "../types/Log.type";

export interface LogFormatter {
    format(format: Log): string
}
