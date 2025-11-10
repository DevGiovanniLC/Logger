import { describe, it, expect } from "vitest";
import { TransportResolver } from "@helpers/TransportResolver";
import { ConsoleTransport } from "@core/Transport/ConsoleTransport";
import { MemoryTransport } from "@core/Transport/MemoryTransport";
import type { TransportParam } from "@helpers/TransportResolver";

describe("TransportResolver", () => {
    it("should resolve transport mode strings into concrete instances", () => {
        const resolved = TransportResolver.resolve("console");

        expect(resolved).toHaveLength(1);
        expect(resolved[0]).toBeInstanceOf(ConsoleTransport);
    });

    it("should deduplicate repeated mode entries and keep provided instances", () => {
        const custom = new MemoryTransport();
        const param: TransportParam = ["console", custom, "console"];

        const resolved = TransportResolver.resolve(param);

        const consoleTransports = resolved.filter((t) => t instanceof ConsoleTransport);

        expect(resolved).toContain(custom);
        expect(consoleTransports).toHaveLength(1);
    });

    it("should return the provided transport when an instance is passed directly", () => {
        const transport = new MemoryTransport();

        expect(TransportResolver.resolve(transport)).toEqual([transport]);
    });

    it("should ignore unsupported modes gracefully", () => {
        const resolved = TransportResolver.resolve("unknown-mode" as any);

        expect(resolved).toEqual([]);
    });
});
