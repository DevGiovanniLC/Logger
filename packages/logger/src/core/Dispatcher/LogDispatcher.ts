import { LogTransport } from "@core/Transport/LogTransport";
import { Level } from "@models/Level.type";
import { Log } from "@models/Log.type";
import { SyncDispatcher } from "./SyncDispatcher";
import { ReactiveDispatcher } from "./ReactiveDispatcher";


export interface LogDispatcher {
    dispatch(log: Log): void;
}

export type DispatcherMode = "sync" | "reactive";

type DispatcherFactory = (transports: LogTransport[], minLevel: Level) => LogDispatcher;

export const DISPATCHER_FACTORIES: Record<"sync" | "reactive", DispatcherFactory> = {
    sync: (transports, minLevel) => new SyncDispatcher(transports, minLevel),
    reactive: (transports, minLevel) => new ReactiveDispatcher(transports, minLevel),
};

export type DispatcherKey = keyof typeof DISPATCHER_FACTORIES;

export const isDispatcherKey = (value: string): value is DispatcherKey => value === "sync" || value === "reactive";


export const normalizeDispatcher = (mode?: DispatcherMode): DispatcherKey => {
    const raw = mode ?? "sync";
    const normalized = raw.toString().toLowerCase();
    if (isDispatcherKey(normalized)) return normalized;
    throw new Error(`Unsupported dispatcher mode "${raw}". Expected "sync" or "reactive".`);
};
