import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import { FileTransport, FileTransportParams } from "@core/Transport/FileTransport";
import { FileTransportError } from "@errors/TransportError/FileTransportError";
import { Log } from "@models/Log.type";
import { Level } from "@models/Level.type";

const formatter = {
    format: () => "[formatted]",
};

const sampleLog: Log = {
    id: 1,
    level: Level.error,
    subject: "File",
    message: "payload",
    timeStamp: 1700000000000,
};

describe("FileTransport", () => {
    let mkdirSpy: any;
    let appendSpy: any;

    beforeEach(() => {
        mkdirSpy = vi.spyOn(fs, "mkdirSync").mockImplementation(() => ".logs");
        appendSpy = vi.spyOn(fs, "appendFileSync").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should ensure the directory exists and append the formatted payload", () => {
        const transport = new FileTransport({ formatter });

        transport.emit(sampleLog);

        expect(mkdirSpy).toHaveBeenCalledWith(expect.stringMatching(/\.logs[\\/]\d{4}-\d{2}-\d{2}/), { recursive: true });
        expect(appendSpy).toHaveBeenCalledWith(
            expect.stringMatching(/\.logs[\\/].+log-\d+\.txt$/),
            "[formatted]\n"
        );
    });

    it("should throw FileTransportError when directory creation fails", () => {
        mkdirSpy.mockImplementation(() => {
            throw new Error("failed");
        });

        expect(() => new FileTransport({ formatter })).toThrow(FileTransportError);
    });

    it("should throw FileTransportError when writing the log fails", () => {
        appendSpy.mockImplementation(() => {
            throw new Error("write failed");
        });
        const transport = new FileTransport({ formatter });

        expect(() => transport.emit(sampleLog)).toThrow(FileTransportError);
    });

    it("should honor string-based constructor overloads for file paths", () => {
        const transport = new FileTransport(".custom-logs" as FileTransportParams);

        transport.emit(sampleLog);

        expect(mkdirSpy).toHaveBeenCalledWith(expect.stringMatching(/\.custom-logs/), { recursive: true });
        expect(appendSpy).toHaveBeenCalledWith(expect.stringMatching(/\.custom-logs/), expect.any(String));
    });

    it("should skip writes when disabled", () => {
        const transport = new FileTransport({ formatter });
        transport.disable();

        transport.emit(sampleLog);

        expect(appendSpy).not.toHaveBeenCalled();
    });
});
