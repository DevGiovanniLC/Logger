import { describe, it, expect, vi } from "vitest";
import { DefaultFormatter } from "@core/Formatter/DefaultFormatter";
import { Level } from "@models/Level.type";
import { Log } from "@models/Log.type";
import { FormatterError } from "@errors/FormatterError/FormatterError";

const baseLog = (overrides: Partial<Log> = {}): Log => ({
    id: overrides.id ?? 42,
    level: overrides.level ?? Level.notice,
    subject: overrides.subject ?? "Formatter",
    message: overrides.message ?? "payload",
    timeStamp: overrides.timeStamp ?? Date.UTC(2024, 0, 1, 12, 0, 0),
});

describe("DefaultFormatter", () => {
    it("should include emoji headers when configured with emojis", () => {
        const formatter = new DefaultFormatter({ withEmojis: true, localeDate: "en-GB" });
        const log = baseLog({ level: Level.alert });

        const output = formatter.format(log);

        expect(output).toContain("\u{1F6A8}");
        expect(output).toContain("ALERT (Formatter): payload");
    });

    it("should wrap output in ANSI codes when color is enabled", () => {
        const formatter = new DefaultFormatter({ color: true, localeDate: "en-GB" });
        const log = baseLog({ level: Level.error });

        const output = formatter.format(log);

        expect(output).toMatch(/\u001B\[\d+m/);
    });

    it("should honor the provided locale when formatting timestamps", () => {
        const locale = "en-GB";
        const formatter = new DefaultFormatter({ localeDate: locale });
        const log = baseLog({ timeStamp: Date.UTC(2024, 4, 15, 16, 30, 0) });
        const expectedDate = new Intl.DateTimeFormat(locale, {
            dateStyle: "short",
            timeStyle: "medium",
        }).format(log.timeStamp);

        const output = formatter.format(log);

        expect(output).toContain(expectedDate);
    });

    it("should throw a FormatterError when Intl.DateTimeFormat initialization fails", () => {
        const original = Intl.DateTimeFormat;
        // @ts-expect-error - force constructor replacement to simulate unsupported environment
        Intl.DateTimeFormat = vi.fn(() => {
            throw new Error("unsupported");
        }) as unknown as typeof Intl.DateTimeFormat;

        expect(() => new DefaultFormatter()).toThrow(FormatterError);

        Intl.DateTimeFormat = original;
    });
});
