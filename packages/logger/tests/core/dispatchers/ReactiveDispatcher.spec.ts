import { describe, it, expect, vi, afterEach } from "vitest";
import { ReactiveDispatcher } from "@core/Dispatcher/ReactiveDispatcher";
import { Level } from "@models/Level.type";
import { Log } from "@models/Log.type";
import { LogTransport } from "@core/Transport/LogTransport";
import { LogFormatter } from "@core/Formatter/LogFormatter";
import type { MetricsCollector } from "@models/Metrics.type";

class StubTransport extends LogTransport {
    public emitted: Log[] = [];
    constructor() {
        super("stub", { formatter: { format: () => "" } as LogFormatter });
    }

    protected performEmit(log: Log): void {
        this.emitted.push(log);
    }
}

const createLog = (level: Level, id = Math.random()): Log => ({
    id,
    level,
    subject: "ReactiveDispatcher",
    message: "payload",
    timeStamp: Date.now(),
});

const metricsCollector = (): MetricsCollector => ({
    recordBuilt: vi.fn(),
    recordDispatched: vi.fn(),
    recordFiltered: vi.fn(),
    recordTransportError: vi.fn(),
});

describe("ReactiveDispatcher", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("should batch logs and flush them asynchronously", () => {
        vi.useFakeTimers();

        const transport = new StubTransport();
        const metrics = metricsCollector();
        const dispatcher = new ReactiveDispatcher(
            [transport],
            Level.debug,
            { intervalMs: 25, idleMs: 1_000, useMessageChannel: false, hookBeforeExit: false },
            metrics
        );

        dispatcher.dispatch(createLog(Level.debug, 1));
        dispatcher.dispatch(createLog(Level.debug, 2));

        expect(transport.emitted).toHaveLength(0);

        vi.advanceTimersByTime(25);

        expect(transport.emitted).toHaveLength(2);
        expect(metrics.recordDispatched).toHaveBeenCalledTimes(2);
    });

    it("should flush immediately when drain() is invoked", () => {
        vi.useFakeTimers();

        const transport = new StubTransport();
        const dispatcher = new ReactiveDispatcher(
            [transport],
            Level.debug,
            { intervalMs: 1_000, idleMs: 1_000, useMessageChannel: false, hookBeforeExit: false }
        );

        dispatcher.dispatch(createLog(Level.debug, 3));
        dispatcher.drain();

        expect(transport.emitted).toHaveLength(1);
    });

    it("should respect the minLevel filter and record filtered logs", () => {
        vi.useFakeTimers();

        const transport = new StubTransport();
        const metrics = metricsCollector();
        const dispatcher = new ReactiveDispatcher(
            [transport],
            Level.warning,
            { intervalMs: 25, idleMs: 1_000, useMessageChannel: false, hookBeforeExit: false },
            metrics
        );

        dispatcher.dispatch(createLog(Level.notice, 4));

        vi.advanceTimersByTime(25);

        expect(transport.emitted).toHaveLength(0);
        expect(metrics.recordFiltered).toHaveBeenCalledTimes(1);
    });

    it("should dispose after inactivity and ignore subsequent dispatches", () => {
        vi.useFakeTimers();

        const transport = new StubTransport();
        const dispatcher = new ReactiveDispatcher(
            [transport],
            Level.debug,
            { intervalMs: 10, idleMs: 20, useMessageChannel: false, hookBeforeExit: false }
        );

        dispatcher.dispatch(createLog(Level.debug, 10));
        vi.advanceTimersByTime(10);
        expect(transport.emitted).toHaveLength(1);

        vi.advanceTimersByTime(20);
        dispatcher.dispatch(createLog(Level.debug, 11));
        vi.advanceTimersByTime(10);

        expect(transport.emitted).toHaveLength(1);
    });
});
