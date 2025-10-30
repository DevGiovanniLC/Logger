import { Log } from "../types/Log.type";

export interface LogDispatcher {
    dispatch(log: Log): void;
}

export type DispatcherMode = 'Sync' | 'Reactive'
