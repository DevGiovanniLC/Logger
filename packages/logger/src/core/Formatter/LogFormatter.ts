import { Log } from "@models/Log.type";

export interface LogFormatter {
    format(log: Log): string;
}
