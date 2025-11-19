import { describe, it, expect } from "vitest";
import { MemoryTransport } from "@core/Transport/MemoryTransport";
import { Log } from "@models/Log.type";
import { Level } from "@models/Level.type";
import type { LogFormatter } from "@core/Formatter/LogFormatter";

const formatter: LogFormatter = {
    format: (log: Log) => `${log.subject}:${log.message}:${log.id}`,
};

const buildLog = (id: number, message: string): Log => ({
    id,
    level: Level.info,
    subject: "Memory",
    message,
    timeStamp: Date.now(),
});

describe("MemoryTransport", () => {
    it("should append formatted logs and respect the buffer limit", () => {
        const transport = new MemoryTransport({ formatter, maxBufferSize: 2 });

        transport.emit(buildLog(1, "first"));
        transport.emit(buildLog(2, "second"));
        transport.emit(buildLog(3, "third"));

        expect(transport.logs).toEqual(["Memory:second:2", "Memory:third:3"]);
    });

    it("should clear the buffer without creating a new instance", () => {
        const transport = new MemoryTransport({ formatter });

        transport.emit(buildLog(1, "first"));
        transport.clear();

        expect(transport.logs).toHaveLength(0);
    });

    it("should provide a snapshot that does not mutate the internal buffer", () => {
        const transport = new MemoryTransport({ formatter });

        transport.emit(buildLog(1, "first"));
        const snapshot = transport.snapshot();
        snapshot.push("tampered");

        expect(snapshot).toHaveLength(2);
        expect(transport.logs).toHaveLength(1);
    });

    it("should honor enable/disable toggles inherited from LogTransport", () => {
        const transport = new MemoryTransport({ formatter });

        transport.disable();
        transport.emit(buildLog(1, "first"));
        expect(transport.logs).toHaveLength(0);

        transport.enable();
        transport.emit(buildLog(2, "second"));
        expect(transport.logs).toHaveLength(1);
    });
});
