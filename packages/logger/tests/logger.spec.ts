import { INFO_LEVEL_ENTRIES, Level } from "@models/Level.type.js";
import { Log } from "@models/Log.type";
import { Logger } from "../src/Logger";

import { describe, it, expect, vi, afterEach } from "vitest";
import { ConsoleTransport, MemoryTransport } from "@core/Transport";
import { DefaultFormatter } from "@core/Formatter/DefaultFormatter";

describe("Logger", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("core behavior", () => {
        it("should normalize structured payloads, dispatch logs, and update metrics", () => {
            const transport = new MemoryTransport();
            const emitSpy = vi.spyOn(transport, "emit");
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
            const emitSpy = vi.spyOn(transport, "emit");
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

        it("should expose info-level helpers that emit with the expected severity", () => {
            const transport = new MemoryTransport();
            const emitSpy = vi.spyOn(transport, "emit");
            const logger = new Logger({ transports: [transport] });
            const context = logger.for("Levels");

            for (const [name, level] of INFO_LEVEL_ENTRIES) {
                const log = context[name](`${name}-payload`);
                expect(log.level).toBe(level);
                expect(log.subject).toBe("Levels");
            }

            expect(emitSpy).toHaveBeenCalledTimes(INFO_LEVEL_ENTRIES.length);
        });

        it("should convert function messages into descriptive tokens", () => {
            function hydrateCache() { /** noop */ }

            const logger = new Logger({ transports: [] });
            const log = logger.debug("Formatter", hydrateCache);

            expect(log.message).toBe("[function hydrateCache]");
        });

        it("should return immutable metrics snapshots even when callers mutate them", () => {
            const logger = new Logger({ transports: [], metrics: { enabled: true } });

            const snapshot = logger.metrics;
            (snapshot as unknown as { built: number }).built = 999;

            logger.info("immutability", "check");

            expect(logger.metrics.built).toBe(1);
        });

        it("should normalize undefined messages into the literal string 'undefined'", () => {
            const transport = new MemoryTransport();
            const emitSpy = vi.spyOn(transport, "emit");
            const logger = new Logger({ transports: [transport] });

            const log = logger.info("Normalizer", undefined);

        expect(log.message).toBe("undefined");
        expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ message: "undefined" }));
    });

    it("should invoke metrics onUpdate for every counter increment", () => {
        const transport = new MemoryTransport();
        const onUpdate = vi.fn();
        const logger = new Logger({
            transports: [transport],
            metrics: { enabled: true, onUpdate },
        });

        logger.info("OnUpdate", "payload");

        expect(onUpdate).toHaveBeenCalledTimes(2);
        expect(onUpdate.mock.calls[0][0]).toMatchObject({
            built: 1,
            dispatched: 0,
        });
        expect(onUpdate.mock.calls[1][0]).toMatchObject({
            built: 1,
            dispatched: 1,
        });
    });

    it("should throw contextual custom errors built from contextual helpers", () => {
        class ContextualError extends Error { }
        const logger = new Logger({ transports: [] });
        const context = logger.for("Contextual");

            expect(() => context.error(ContextualError, "failed op")).toThrow(ContextualError);
            try {
                context.error(ContextualError, "failed op");
            } catch (err) {
                const error = err as Error;
                expect(error.message).toContain("(Contextual)");
                expect(error.message).toContain("failed op");
            }
        });
    });

    describe("transport integration", () => {
        it("should respect MemoryTransport buffer limits when provided", () => {
            const transport = new MemoryTransport({ maxBufferSize: 1 });
            const logger = new Logger({ transports: [transport] });

            logger.info("Buffer", "first");
            logger.info("Buffer", "second");

            expect(transport.logs).toHaveLength(1);
            expect(transport.logs[0]).toContain("second");
        });

        it("should emit logs once per unique transport mode entry", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const logger = new Logger({ transports: ["console", "console"] });

            logger.warn("Dedup", "payload");

            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it("should allow injecting custom console transports with bespoke formatters", () => {
            const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
            const formatter = new DefaultFormatter({ withEmojis: true });
            const transport = new ConsoleTransport({ formatter });
            const logger = new Logger({ transports: [transport] });

            logger.info("CustomConsole", "payload");

            const output = infoSpy.mock.calls[0][0] as string;
            expect(output).toContain("CustomConsole");
            expect(output).toContain("payload");
            expect(output).toContain("\u{2139}");
        });

        describe("console transport modes", () => {
            it("should route warning logs through console.warn when using console transport", () => {
                const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
                const logger = new Logger({ transports: ["console"] });

                logger.warn("ConsoleTransport", "payload");

                expect(warnSpy).toHaveBeenCalledWith(
                    expect.stringContaining("WARN (ConsoleTransport): payload")
                );
            });

            it("should decorate output with emojis when using console-emoji transport", () => {
                const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
                const logger = new Logger({ transports: ["console-emoji"] });

                logger.alert("EmojiTransport", "payload");

                const output = errorSpy.mock.calls[0][0] as string;
                expect(output).toContain("\u{1F6A8}");
                expect(output).toContain("ALERT (EmojiTransport): payload");
            });

            it("should wrap outputs with ANSI codes when using console-color transport", () => {
                const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
                const logger = new Logger({ transports: ["console-color"] });

                logger.error("ColorTransport", "payload");

                const output = errorSpy.mock.calls[0][0] as string;
                expect(output).toContain("\u001B[");
                expect(output).toContain("ERROR (ColorTransport): payload");
            });

            it("should combine color and emojis when using console-styled transport", () => {
                const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
                const logger = new Logger({ transports: ["console-styled"] });

                logger.notice("StyledTransport", "payload");

                const output = infoSpy.mock.calls[0][0] as string;
                expect(output).toContain("\u001B[");
                expect(output).toContain("\u{1F4E3}");
                expect(output).toMatch(/NOTICE \(StyledTransport\): payload/);
            });
        });
    });

    describe("dispatcher modes", () => {
        it("should dispatch synchronously when using sync dispatcher", () => {
            const transport = new MemoryTransport();
            const emitSpy = vi.spyOn(transport, "emit");
            const logger = new Logger({ transports: [transport], dispatcher: "sync" });

            logger.info("Sync", "immediate");

            expect(emitSpy).toHaveBeenCalledTimes(1);
        });

        it("should batch and flush logs asynchronously when using reactive dispatcher", () => {
            vi.useFakeTimers();
            try {
                const transport = new MemoryTransport();
                const emitSpy = vi.spyOn(transport, "emit");
                const logger = new Logger({ transports: [transport], dispatcher: "reactive" });

                logger.debug("Reactive", "first");
                logger.debug("Reactive", "second");

                expect(emitSpy).not.toHaveBeenCalled();

                vi.runOnlyPendingTimers();

                expect(emitSpy).toHaveBeenCalledTimes(2);
            } finally {
                vi.useRealTimers();
            }
        });
    });

    describe("formatter integration", () => {
        const buildLog = (overrides: Partial<Log> = {}): Log =>
            ({
                id: 42,
                level: Level.Notice,
                subject: "Formatter",
                message: "payload",
                timeStamp: Date.UTC(2024, 0, 1, 12, 0, 0),
                ...overrides,
            } as Log);

        it("should include emoji icons when configured with emojis", () => {
            const formatter = new DefaultFormatter({ withEmojis: true });
            const log = buildLog({ level: Level.Alert });

            const output = formatter.format(log);

            expect(output).toContain("\u{1F6A8}");
            expect(output).toContain("ALERT (Formatter): payload");
        });

        it("should wrap formatted output with ANSI codes when color is enabled", () => {
            const formatter = new DefaultFormatter({ color: true });
            const log = buildLog({ level: Level.Error });

            const output = formatter.format(log);

            expect(output).toMatch(/\u001B\[\d+m/);
        });

        it("should honor the provided locale when formatting timestamps", () => {
            const locale = "en-GB";
            const formatter = new DefaultFormatter({ localeDate: locale });
            const timeStamp = Date.UTC(2024, 4, 15, 16, 30, 0);
            const log = buildLog({ timeStamp });
            const expectedDate = new Intl.DateTimeFormat(locale, {
                dateStyle: "short",
                timeStyle: "medium",
            }).format(timeStamp);

            const output = formatter.format(log);

            expect(output).toContain(expectedDate);
        });
    });
});
