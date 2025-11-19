import { describe, it, expect } from "vitest";
import {
    DISPATCHER_FACTORIES,
    normalizeDispatcher,
    isDispatcherKey,
} from "@core/Dispatcher/DispatcherRegistry";
import { SyncDispatcher } from "@core/Dispatcher/SyncDispatcher";
import { ReactiveDispatcher } from "@core/Dispatcher/ReactiveDispatcher";
import { Level } from "@models/Level.type";
import { Log } from "@models/Log.type";
import { LogTransport } from "@core/Transport/LogTransport";
import { LogFormatter } from "@core/Formatter/LogFormatter";

class StubTransport extends LogTransport {
    protected performEmit(_: Log): void {
        // noop
    }

    constructor() {
        super("stub", { formatter: { format: () => "" } as LogFormatter });
    }
}

describe("DispatcherRegistry", () => {
    it("should normalize dispatcher names and default to sync", () => {
        expect(normalizeDispatcher()).toBe("sync");
        expect(normalizeDispatcher("sync")).toBe("sync");
        expect(normalizeDispatcher("reactive")).toBe("reactive");
        expect(() => normalizeDispatcher("unknown" as any)).toThrow(
            'Unsupported dispatcher mode "unknown". Expected "sync" or "reactive".'
        );
    });

    it("should accept mixed-case dispatcher identifiers", () => {
        expect(normalizeDispatcher("ReAcTiVe" as any)).toBe("reactive");
    });

    it("should expose runtime guards for dispatcher keys", () => {
        expect(isDispatcherKey("sync")).toBe(true);
        expect(isDispatcherKey("reactive")).toBe(true);
        expect(isDispatcherKey("unknown")).toBe(false);
    });

    it("should instantiate the correct dispatcher type via the registry factories", () => {
        const transports = [new StubTransport()];
        const metrics = undefined;

        const sync = DISPATCHER_FACTORIES.sync(transports, Level.debug, metrics);
        const reactive = DISPATCHER_FACTORIES.reactive(transports, Level.debug, metrics);

        expect(sync).toBeInstanceOf(SyncDispatcher);
        expect(reactive).toBeInstanceOf(ReactiveDispatcher);
    });
});
