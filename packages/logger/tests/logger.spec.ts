import { LogTransport } from "@core/Transport/LogTransport.js";
import { Level } from "@models/Level.type.js";
import { Log } from "@models/Log.type.js";
import { AppLogger, Logger } from "../src/Logger";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";


class MemoryTransport extends LogTransport {
    public readonly logs: Log[] = [];
    public readonly emitSpy = vi.fn((log: Log) => {
        this.logs.push(log);
    });

    constructor() {
        super("memory");
    }

    protected performEmit(log: Log): void {
        this.emitSpy(log);
    }
}

describe("Logger", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("normalizes messages, dispatches logs, and updates metrics", () => {
        const transport = new MemoryTransport();
        const onUpdate = vi.fn();
        const logger = new Logger({
            transports: [transport],
            metrics: { enabled: true, onUpdate },
        });

        const log = logger.warn("Auth", { userId: 42 });

        expect(transport.emitSpy).toHaveBeenCalledTimes(1);
        expect(transport.logs[0]).toMatchObject({
            level: Level.Warning,
            subject: "Auth",
        });
        expect(log.message).toContain('"userId":42');
        expect(onUpdate).toHaveBeenCalledTimes(2);
        expect(onUpdate).toHaveBeenLastCalledWith({
            built: 1,
            dispatched: 1,
            filtered: 0,
            transportErrors: 0,
        });
    });

    it("creates contextual loggers with derived subjects", () => {
        class PaymentsService { }

        const transport = new MemoryTransport();
        const logger = new Logger({ transports: [transport] });

        const context = logger.for(new PaymentsService());
        const result = context.info("processed");

        expect(result.subject).toBe("PaymentsService");
        expect(transport.emitSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                subject: "PaymentsService",
                message: "processed",
            })
        );
    });

    it("throws provided errors without emitting when invoked with an Error instance", () => {
        const logger = new Logger({ transports: [] });
        const err = new Error("boom");

        expect(() => logger.error("Billing", err)).toThrow(err);
    });

    it("builds custom errors when provided an Error constructor", () => {
        class CustomError extends Error { }

        const logger = new Logger({ transports: [] });

        let thrown: unknown;

        try {
            logger.critical("Payments", CustomError, "failure");
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toBeInstanceOf(CustomError);
        expect((thrown as Error).message).toContain("(Payments)");
        expect((thrown as Error).message).toContain("failure");
    });
});

describe("AppLogger", () => {
    let transport: MemoryTransport;

    beforeEach(() => {
        transport = new MemoryTransport();
        AppLogger.init({ transports: [transport], metrics: { enabled: true } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        // Reset the singleton to avoid state leakage between tests.
        AppLogger.init({ transports: [], metrics: { enabled: true } });
    });

    it("forwards level helpers to the shared logger instance", () => {
        const log = AppLogger.notice("Loaded configuration");

        expect(log.subject).toBe("APP");
        expect(transport.emitSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                subject: "APP",
                message: "Loaded configuration",
                level: Level.Notice,
            })
        );
    });

    it("exposes metrics gathered by the shared logger", () => {
        AppLogger.warn("Cache warm-up");
        AppLogger.info("Cache warm-up done");

        const metrics = AppLogger.metrics;
        expect(metrics.built).toBeGreaterThanOrEqual(2);
        expect(metrics.dispatched).toBeGreaterThanOrEqual(2);
    });
});
