import { Level } from "@models/Level.type.js";
import { AppLogger } from "../src/Logger";

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { MemoryTransport } from "@core/Transport";
import { Log } from "@models/Log.type";
import { MetricError } from "@errors/LoggerError";


describe("AppLogger", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        AppLogger.reset();
    });

    describe("when initialized with transports", () => {
        let transport: MemoryTransport;
        let emitSpy: Mock<(log: Log) => void>;

        beforeEach(() => {
            transport = new MemoryTransport();
            emitSpy = vi.spyOn(transport, "emit");
            AppLogger.init({ transports: [transport], metrics: { enabled: true } });
        });

        it("should forward level helpers to the shared logger instance", () => {
            const log = AppLogger.notice("Loaded configuration");

            expect(log.subject).toBe("APP");
            expect(emitSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: "APP",
                    message: "Loaded configuration",
                    level: Level.notice,
                })
            );
        });

        it("should expose metrics gathered by the shared logger", () => {
            AppLogger.warn("Cache warm-up");
            AppLogger.info("Cache warm-up done");

            const metrics = AppLogger.metrics;
            expect(metrics.built).toBeGreaterThanOrEqual(2);
            expect(metrics.dispatched).toBeGreaterThanOrEqual(2);
            expect(metrics.transportErrors).toBe(0);
        });

        it("should reuse the same contextual instance between calls", () => {
            const first = AppLogger.instance;
            const second = AppLogger.instance;

            expect(first).toBe(second);
        });

        it("should expose contextual metrics through the shared instance", () => {
            AppLogger.info("Indexing step");

            const contextMetrics = AppLogger.instance.metrics();

            expect(contextMetrics).toEqual(AppLogger.metrics);
            expect(contextMetrics.built).toBeGreaterThanOrEqual(1);
        });

        it("should reuse shared transports when AppLogger.for is invoked without options", () => {
            const scoped = AppLogger.for("Scoped");

            const log = scoped.debug("from context");

            expect(log.subject).toBe("Scoped");
            expect(emitSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: "Scoped",
                    message: "from context",
                    level: Level.debug,
                })
            );
        });

        it("should derive contextual subjects from object instances when using AppLogger.for", () => {
            class AnalyticsEngine { }

            const scoped = AppLogger.for(new AnalyticsEngine());
            const log = scoped.info("event");

            expect(log.subject).toBe("AnalyticsEngine");
            expect(emitSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: "AnalyticsEngine",
                    level: Level.informational,
                })
            );
        });

        it("should default contextual subjects to \"Unknown\" when no name can be derived", () => {
            const scoped = AppLogger.for(Object.create(null));
            const log = scoped.notice("anonymous");

            expect(log.subject).toBe("Unknown");
        });

        it("should emit emergency logs when invoked with plain messages", () => {
            const log = AppLogger.emergency("panic");

            expect(log.level).toBe(Level.emergency);
            expect(log.message).toContain("panic");
            expect(emitSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: Level.emergency,
                })
            );
        });

        it("should create dedicated contextual loggers when per-call options are provided", () => {
            const dedicatedTransport = new MemoryTransport();
            const dedicatedEmit = vi.spyOn(dedicatedTransport, "emit");

            const scopedLogger = AppLogger.for("Scoped", {
                transports: [dedicatedTransport],
                metrics: { enabled: true },
            });

            scopedLogger.info("custom pipeline");

            expect(dedicatedEmit).toHaveBeenCalledTimes(1);
            expect(emitSpy).not.toHaveBeenCalled();
            expect(dedicatedEmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: "Scoped",
                    message: "custom pipeline",
                    level: Level.informational,
                })
            );
        });

        it("should rethrow provided errors when using shared error helpers", () => {
            const boom = new Error("boom");

            expect(() => AppLogger.error(boom)).toThrow(boom);
            expect(emitSpy).not.toHaveBeenCalled();
        });

        it("should build custom errors when error builders are forwarded through static helpers", () => {
            class FatalError extends Error { }

            expect(() => AppLogger.emergency(FatalError, "panic")).toThrow(FatalError);
            expect(emitSpy).not.toHaveBeenCalled();
        });

        it("should surface transport failures through metrics", () => {
            emitSpy.mockImplementation(() => {
                throw new Error("emit failed");
            });

            expect(() => AppLogger.notice("flaky")).not.toThrow();

            const metrics = AppLogger.metrics;
            expect(metrics.transportErrors).toBeGreaterThanOrEqual(1);
            expect(metrics.dispatched).toBeGreaterThanOrEqual(1);
        });

        it("should honor configured minLevel thresholds when static helpers are used", () => {
            const strictTransport = new MemoryTransport();
            const strictEmit = vi.spyOn(strictTransport, "emit");
            AppLogger.init({
                transports: [strictTransport],
                minLevel: Level.error,
                metrics: { enabled: true },
            });

            AppLogger.info("should be filtered");

            expect(strictEmit).not.toHaveBeenCalled();
            expect(AppLogger.metrics.filtered).toBeGreaterThanOrEqual(1);
        });
    });

    describe("without initialization", () => {
        beforeEach(() => {
            AppLogger.reset();
        });

        it("should throw a descriptive error when helpers are used before init", () => {

            expect(() => AppLogger.info("cold start")).toThrow("AppLogger.init() requested");
        });

        it("should throw when metrics are accessed before init", () => {

            expect(() => AppLogger.metrics).toThrow("AppLogger.init() requested");
        });

        it("should throw when the instance getter is accessed before init", () => {

            expect(() => AppLogger.instance).toThrow("AppLogger.init() requested");
        });
    });

    describe("when reinitializing", () => {
        it("should replace shared transports when init is invoked again", () => {
            const firstTransport = new MemoryTransport();
            const firstEmit = vi.spyOn(firstTransport, "emit");
            AppLogger.init({ transports: [firstTransport], metrics: { enabled: true } });

            AppLogger.info("first pipeline");

            const secondTransport = new MemoryTransport();
            const secondEmit = vi.spyOn(secondTransport, "emit");
            AppLogger.init({ transports: [secondTransport], metrics: { enabled: true } });

            AppLogger.info("second pipeline");

            expect(firstEmit).toHaveBeenCalledTimes(1);
            expect(secondEmit).toHaveBeenCalledTimes(1);
        });
    });

    describe("after reset", () => {
        it("should require reinitialization before using helpers again", () => {
            AppLogger.init({ transports: [], metrics: { enabled: true } });

            AppLogger.reset();

            expect(() => AppLogger.warn("orphan log")).toThrow("AppLogger.init() requested");
        });

        it("should allow initializing fresh transports after a reset", () => {
            const initialTransport = new MemoryTransport();
            AppLogger.init({ transports: [initialTransport], metrics: { enabled: true } });

            AppLogger.reset();

            const nextTransport = new MemoryTransport();
            const nextEmit = vi.spyOn(nextTransport, "emit");

            AppLogger.init({ transports: [nextTransport], metrics: { enabled: true } });
            AppLogger.notice("restored");

            expect(nextEmit).toHaveBeenCalledTimes(1);
        });
    });

    describe("with metrics disabled", () => {
        it("should throw MetricError when metrics are disabled", () => {
            AppLogger.reset();
            AppLogger.init({ transports: [], metrics: { enabled: false } });

            expect(() => AppLogger.metrics).toThrow(MetricError)
        });
    });
});
