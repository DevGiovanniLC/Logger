import { describe, it, expect, vi } from "vitest";
import { SyncDispatcher } from "@core/Dispatcher/SyncDispatcher";
import { Level } from "@models/Level.type";
import { Log } from "@models/Log.type";
import { LogTransport } from "@core/Transport/LogTransport";
import { LogFormatter } from "@core/Formatter/LogFormatter";
import type { MetricsCollector } from "@models/Metrics.type";

class StubTransport extends LogTransport {
    public emitted: Log[] = [];
    constructor(private readonly shouldThrow = false) {
        super("stub", { formatter: { format: () => "" } as LogFormatter });
    }

    protected performEmit(log: Log): void {
        if (this.shouldThrow) {
            throw new Error("transport failed");
        }
        this.emitted.push(log);
    }
}

const buildLog = (level: Level): Log => ({
    id: 1,
    level,
    subject: "SyncDispatcher",
    message: "payload",
    timeStamp: Date.now(),
});

const metricsCollector = (): MetricsCollector => ({
    recordBuilt: vi.fn(),
    recordDispatched: vi.fn(),
    recordFiltered: vi.fn(),
    recordTransportError: vi.fn(),
});

describe("SyncDispatcher", () => {
    it("should emit logs whose level satisfies the configured minLevel", () => {
        const transport = new StubTransport();
        const metrics = metricsCollector();
        const dispatcher = new SyncDispatcher([transport], Level.warning, metrics);

        dispatcher.dispatch(buildLog(Level.error));

        expect(transport.emitted).toHaveLength(1);
        expect(metrics.recordDispatched).toHaveBeenCalledTimes(1);
    });

    it("should filter logs above the minLevel threshold", () => {
        const transport = new StubTransport();
        const metrics = metricsCollector();
        const dispatcher = new SyncDispatcher([transport], Level.warning, metrics);

        dispatcher.dispatch(buildLog(Level.notice));

        expect(transport.emitted).toHaveLength(0);
        expect(metrics.recordFiltered).toHaveBeenCalledTimes(1);
    });

    it("should capture transport errors via the metrics collector without throwing", () => {
        const transport = new StubTransport(true);
        const metrics = metricsCollector();
        const dispatcher = new SyncDispatcher([transport], Level.debug, metrics);

        expect(() => dispatcher.dispatch(buildLog(Level.debug))).not.toThrow();
        expect(metrics.recordTransportError).toHaveBeenCalledTimes(1);
    });

    it("should silently skip dispatch when no transports are configured", () => {
        const metrics = metricsCollector();
        const dispatcher = new SyncDispatcher([], Level.debug, metrics);

        dispatcher.dispatch(buildLog(Level.debug));

        expect(metrics.recordDispatched).not.toHaveBeenCalled();
    });
});
