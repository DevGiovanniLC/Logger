import { Level } from './Level.type';

/**
 * Immutable log payload produced by the logger pipeline.
 */
export type Log = Readonly<{
    id: number;
    level: Level;
    subject: string;
    message: string;
    timeStamp: number;
}>;
