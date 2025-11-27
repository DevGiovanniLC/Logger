import { describe, it, expect, vi } from "vitest";
import { Level } from "@models/Level.type.js";
import { Logger } from "../src/Logger";
import { MemoryTransport } from "@core/Transport";

const LEVEL_CALLS = [
    { label: "EMERGENCY", level: Level.emergency, emit: (logger: Logger, subject: string) => logger.emergency(subject, "emergency") },
    { label: "ALERT", level: Level.alert, emit: (logger: Logger, subject: string) => logger.alert(subject, "alert") },
    { label: "CRITICAL", level: Level.critical, emit: (logger: Logger, subject: string) => logger.critical(subject, "critical") },
    { label: "ERROR", level: Level.error, emit: (logger: Logger, subject: string) => logger.error(subject, "error") },
    { label: "WARN", level: Level.warning, emit: (logger: Logger, subject: string) => logger.warn(subject, "warn") },
    { label: "NOTICE", level: Level.notice, emit: (logger: Logger, subject: string) => logger.notice(subject, "notice") },
    { label: "INFO", level: Level.informational, emit: (logger: Logger, subject: string) => logger.info(subject, "info") },
    { label: "DEBUG", level: Level.debug, emit: (logger: Logger, subject: string) => logger.debug(subject, "debug") },
];

describe("Logger metrics with minLevel", () => {
    it("should collect metrics per level and filter logs above the threshold", () => {
        const transport = new MemoryTransport();
        const onUpdate = vi.fn();
        const logger = new Logger({
            transports: [transport],
            minLevel: Level.warning,
            metrics: { enabled: true, onUpdate },
        });

        const subject = "MetricsMinLevel";
        const emitted = [
            logger.emergency(subject, "emergency"),
            logger.alert(subject, "alert"),
            logger.critical(subject, "critical"),
            logger.error(subject, "error"),
            logger.warn(subject, "warn"),
            logger.notice(subject, "notice"),
            logger.info(subject, "info"),
            logger.debug(subject, "debug"),
        ];

        const dispatchedLabels = ["EMERGENCY", "ALERT", "CRITICAL", "ERROR", "WARN"];
        const filteredLabels = ["NOTICE", "INFO", "DEBUG"];

        expect(emitted.map((log) => log.level)).toEqual([
            Level.emergency,
            Level.alert,
            Level.critical,
            Level.error,
            Level.warning,
            Level.notice,
            Level.informational,
            Level.debug,
        ]);

        expect(transport.logs).toHaveLength(dispatchedLabels.length);
        for (const label of dispatchedLabels) {
            expect(transport.logs.some((entry) => entry.includes(label))).toBe(true);
        }
        for (const label of filteredLabels) {
            expect(transport.logs.some((entry) => entry.includes(label))).toBe(false);
        }

        expect(logger.metrics).toEqual({
            built: emitted.length,
            dispatched: dispatchedLabels.length,
            filtered: filteredLabels.length,
            transportErrors: 0,
            thrownErrors: 0,
        });
        expect(onUpdate).toHaveBeenCalledTimes(emitted.length * 2);
        expect(onUpdate).toHaveBeenLastCalledWith({
            built: emitted.length,
            dispatched: dispatchedLabels.length,
            filtered: filteredLabels.length,
            transportErrors: 0,
            thrownErrors: 0,
        });
    });

    it.each([
        { minLevel: Level.emergency },
        { minLevel: Level.alert },
        { minLevel: Level.critical },
        { minLevel: Level.error },
        { minLevel: Level.warning },
        { minLevel: Level.notice },
        { minLevel: Level.informational },
        { minLevel: Level.debug },
    ])("should respect minLevel %s for all levels", ({ minLevel }) => {
        const transport = new MemoryTransport();
        const onUpdate = vi.fn();
        const logger = new Logger({
            transports: [transport],
            minLevel,
            metrics: { enabled: true, onUpdate },
        });

        const subject = `Matrix-${minLevel}`;
        const emitted = LEVEL_CALLS.map(({ emit }) => emit(logger, subject));
        const dispatchedLabels = LEVEL_CALLS.filter(({ level }) => level <= minLevel).map(({ label }) => label);
        const filteredLabels = LEVEL_CALLS.filter(({ level }) => level > minLevel).map(({ label }) => label);

        expect(transport.logs).toHaveLength(dispatchedLabels.length);
        for (const label of dispatchedLabels) {
            expect(transport.logs.some((entry) => entry.includes(label))).toBe(true);
        }
        for (const label of filteredLabels) {
            expect(transport.logs.some((entry) => entry.includes(label))).toBe(false);
        }

        expect(logger.metrics).toEqual({
            built: LEVEL_CALLS.length,
            dispatched: dispatchedLabels.length,
            filtered: filteredLabels.length,
            transportErrors: 0,
            thrownErrors: 0,
        });
        expect(onUpdate).toHaveBeenCalledTimes(LEVEL_CALLS.length * 2);
        expect(emitted.map((log) => log.level)).toEqual(LEVEL_CALLS.map(({ level }) => level));
    });

    it.each([
        { minLevel: Level.emergency, handler: "error" as const },
        { minLevel: Level.notice, handler: "critical" as const },
    ])("should throw and record thrownErrors even when minLevel is %s", ({ minLevel, handler }) => {
        const transport = new MemoryTransport();
        const onUpdate = vi.fn();
        const logger = new Logger({
            transports: [transport],
            minLevel,
            metrics: { enabled: true, onUpdate },
        });

        const subject = `Throw-${handler}-${minLevel}`;
        const err = new Error("boom");

        const invoke = handler === "error"
            ? () => logger.error(subject, err)
            : () => logger.critical(subject, err);

        expect(invoke).toThrow(err);

        expect(transport.logs).toHaveLength(0);
        expect(logger.metrics).toEqual({
            built: 0,
            dispatched: 0,
            filtered: 0,
            transportErrors: 0,
            thrownErrors: 1,
        });
        expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it("should not increment dispatched when throwing via an Error builder", () => {
        class Boom extends Error { }
        const transport = new MemoryTransport();
        const onUpdate = vi.fn();
        const logger = new Logger({
            transports: [transport],
            minLevel: Level.debug,
            metrics: { enabled: true, onUpdate },
        });

        const subject = "ThrowBuilder";

        expect(() => logger.error(subject, Boom, "fails")).toThrow(Boom);
        expect(transport.logs).toHaveLength(0);
        expect(logger.metrics).toEqual({
            built: 0,
            dispatched: 0,
            filtered: 0,
            transportErrors: 0,
            thrownErrors: 1,
        });
        expect(onUpdate).toHaveBeenCalledTimes(1);
    });
});
