import { Level } from "./Level.type";

export type Log = Readonly<{
    id: number;
    level: Level;
    subject: string;
    message: string;
    timeStamp: number;
}>;
