import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleTransport } from "@core/Transport/ConsoleTransport";
import { Log } from "@models/Log.type";
import { Level } from "@models/Level.type";
import type { LogFormatter } from "@core/Formatter/LogFormatter";

const formatter: LogFormatter = {
    format: (log: Log) => `${log.subject}:${Level[log.level]}:${log.message}`,
};

const buildLog = (level: Level): Log => ({
    id: level,
    level,
    subject: "Console",
    message: "payload",
    timeStamp: Date.now(),
});

describe("ConsoleTransport", () => {
    let transport: ConsoleTransport;

    beforeEach(() => {
        transport = new ConsoleTransport({ formatter });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should route critical levels through console.error", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

        for (const level of [Level.emergency, Level.alert, Level.critical, Level.error]) {
            transport.emit(buildLog(level));
        }

        expect(errorSpy).toHaveBeenCalledTimes(4);
    });

    it("should route warnings through console.warn", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        transport.emit(buildLog(Level.warning));

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Console:warning:payload"));
    });

    it("should route notices and info through console.info", () => {
        const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

        transport.emit(buildLog(Level.notice));
        transport.emit(buildLog(Level.informational));

        expect(infoSpy).toHaveBeenCalledTimes(2);
    });

    it("should route debug logs through console.debug", () => {
        const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);

        transport.emit(buildLog(Level.debug));

        expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("Console:debug:payload"));
    });

    it("should respect enable/disable toggles before emitting", () => {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        transport.disable();
        transport.emit(buildLog(Level.warning));
        expect(warnSpy).not.toHaveBeenCalled();

        transport.enable();
        transport.emit(buildLog(Level.warning));
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });
});
