import { Level } from "@models/Level.type.js";
import { Logger } from "../src/Logger";

import { describe, it, expect, vi, afterEach } from "vitest";
import { MemoryTransport } from "@core/Transport";


describe("Logger", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should normalize structured payloads, dispatch logs, and update metrics", () => {
        const transport = new MemoryTransport();
        const emitSpy = vi.spyOn(transport, 'emit');
        const onUpdate = vi.fn();
        const logger = new Logger({
            transports: [transport],
            metrics: { enabled: true, onUpdate },
        });

        const log = logger.warn("Auth", { userId: 42 });

        expect(emitSpy).toHaveBeenCalledTimes(1);
        expect(log).toMatchObject({
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

    it("should create contextual loggers with derived subjects", () => {
        class PaymentsService { }

        const transport = new MemoryTransport();
        const emitSpy = vi.spyOn(transport, 'emit');
        const logger = new Logger({ transports: [transport] });

        const context = logger.for(new PaymentsService());
        const result = context.info("processed");

        expect(result.subject).toBe("PaymentsService");
        expect(emitSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                subject: "PaymentsService",
                message: "processed",
            })
        );
    });

    it("should throw provided errors without emitting when invoked with an Error instance", () => {
        const logger = new Logger({ transports: [] });
        const err = new Error("boom");

        expect(() => logger.error("Billing", err)).toThrow(err);
    });

    it("should build custom errors when provided an Error constructor", () => {
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

    it("should filter logs below the configured level and track filtered metrics", () => {
        const transport = new MemoryTransport();
        const emitSpy = vi.spyOn(transport, "emit");
        const onUpdate = vi.fn();
        const logger = new Logger({
            transports: [transport],
            minLevel: Level.Warning,
            metrics: { enabled: true, onUpdate },
        });

        logger.info("Payments", "noise");

        expect(emitSpy).not.toHaveBeenCalled();
        expect(logger.metrics).toMatchObject({
            built: 1,
            dispatched: 0,
            filtered: 1,
            transportErrors: 0,
        });
        expect(onUpdate).toHaveBeenCalledTimes(2);
        expect(onUpdate).toHaveBeenLastCalledWith({
            built: 1,
            dispatched: 0,
            filtered: 1,
            transportErrors: 0,
        });
    });

    it("should expose metrics snapshots through contextual loggers", () => {
        const logger = new Logger({ transports: [], metrics: { enabled: true } });
        const context = logger.for("Orders");

        context.notice("started");

        const snapshot = context.metrics();
        expect(snapshot).toEqual(logger.metrics);
        expect(snapshot).toMatchObject({
            built: 1,
            dispatched: 0,
            filtered: 0,
            transportErrors: 0,
        });
    });

    it("should increment log identifiers sequentially even without transports", () => {
        const logger = new Logger({ transports: [] });

        const first = logger.debug("IDs", "first");
        const second = logger.debug("IDs", "second");

        expect(second.id).toBe(first.id + 1);
        expect(second.timeStamp).toBeGreaterThanOrEqual(first.timeStamp);
    });

    it("should stringify circular payloads safely before dispatch", () => {
        const transport = new MemoryTransport();
        const emitSpy = vi.spyOn(transport, "emit");
        const logger = new Logger({ transports: [transport] });

        const payload: Record<string, unknown> & { self?: unknown } = { action: "circular" };
        payload.self = payload;

        const log = logger.info("Normalizer", payload);

        expect(log.message).toContain("[Circular]");
        expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ message: log.message }));
    });

    it("should record transport errors when transports fail to emit", () => {
        const transport = new MemoryTransport();
        const emitSpy = vi.spyOn(transport, "emit").mockImplementation(() => {
            throw new Error("emit failed");
        });
        const logger = new Logger({
            transports: [transport],
            metrics: { enabled: true },
        });

        logger.notice("Audit", "event");

        expect(emitSpy).toHaveBeenCalled();
        expect(logger.metrics).toMatchObject({
            built: 1,
            dispatched: 1,
            filtered: 0,
            transportErrors: 1,
        });
    });

    it("should fall back to 'Unknown' when the contextual subject cannot be resolved", () => {
        const logger = new Logger({ transports: [] });
        const context = logger.for(Object.create(null));

        const log = context.debug("ping");

        expect(log.subject).toBe("Unknown");
    });

    it("should freeze contextual loggers to guard against accidental mutation", () => {
        const logger = new Logger({ transports: [] });
        const context = logger.for("Guards");

        expect(Object.isFrozen(context)).toBe(true);
    });

    it("should isolate metrics between independent logger instances", () => {
        const loggerA = new Logger({ transports: [], metrics: { enabled: true } });
        const loggerB = new Logger({ transports: [], metrics: { enabled: true } });

        loggerA.info("A", "first");

        expect(loggerA.metrics.built).toBe(1);
        expect(loggerB.metrics.built).toBe(0);
    });
});
