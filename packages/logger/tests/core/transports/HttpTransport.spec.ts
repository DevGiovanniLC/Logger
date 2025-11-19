import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { HttpTransport, HttpTransportParams } from "@core/Transport/HttpTransport";
import { Log } from "@models/Log.type";
import { Level } from "@models/Level.type";
import { HttpTransportError } from "@errors/TransportError/HttpTransportError";

const buildTransport = (params?: Partial<HttpTransportParams>) =>
    new HttpTransport({
        endpoint: "https://api.test/logs",
        ...params,
    } as HttpTransportParams);

const makeLog = (id = 1): Log => ({
    id,
    level: Level.error,
    subject: "Http",
    message: "payload",
    timeStamp: 1700000000000,
});

describe("HttpTransport", () => {
    let originalFetch: typeof fetch | undefined;

    beforeEach(() => {
        originalFetch = globalThis.fetch;
        globalThis.fetch = vi.fn();
    });

    afterEach(() => {
        globalThis.fetch = originalFetch as typeof fetch;
        vi.restoreAllMocks();
    });

    it("should throw when instantiated without an endpoint", () => {
        expect(() => new HttpTransport({} as HttpTransportParams)).toThrow(HttpTransportError);
    });

    it("should throw when fetch implementation is missing", () => {
        globalThis.fetch = undefined as unknown as typeof fetch;
        expect(() => new HttpTransport({ endpoint: "https://api.test/logs" } as HttpTransportParams)).toThrow(
            HttpTransportError
        );
    });

    it("should send POST requests with the serialized log payload", async () => {
        const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock.mockResolvedValue({ ok: true, status: 204 });
        const transport = buildTransport();

        await (transport as any).post('{"formatted":"log"}');

        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.test/logs",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({ "content-type": "application/json" }),
                body: '{"formatted":"log"}',
            })
        );
    });

    it("should translate non-ok responses into HttpTransportError", async () => {
        const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock.mockResolvedValue({ ok: false, status: 503 });
        const transport = buildTransport();

        await expect((transport as any).post("{}")).rejects.toBeInstanceOf(HttpTransportError);
    });

    it("should translate network failures into HttpTransportError", async () => {
        const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock.mockRejectedValue(new TypeError("network down"));
        const transport = buildTransport();

        await expect((transport as any).post("{}")).rejects.toBeInstanceOf(HttpTransportError);
    });

    it("should drop payloads after a failed request when retryOnFailure is false", async () => {
        const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock.mockRejectedValue(new TypeError("boom"));
        const transport = buildTransport({ retryOnFailure: false });

        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const queue = (transport as unknown as { queue: Array<{ body: string; log: Log }> }).queue;
        queue.push({ body: JSON.stringify({ log: makeLog(1) }), log: makeLog(1) });
        (transport as unknown as { flushQueue: () => void }).flushQueue();
        await vi.waitUntil(() => queue.length === 0);

        expect(queue).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalled();
    });

    it("should keep payloads when retryOnFailure is true", async () => {
        const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock.mockRejectedValue(new TypeError("boom"));
        const transport = buildTransport({ retryOnFailure: true });
        const queue = (transport as unknown as { queue: Array<{ body: string; log: Log }> }).queue;
        queue.push({ body: JSON.stringify({ log: makeLog(2) }), log: makeLog(2) });
        (transport as unknown as { flushQueue: () => void }).flushQueue();
        await vi.waitUntil(() => queue.length === 1);
    });

    it("should reuse provided headers when posting", async () => {
        const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
        fetchMock.mockResolvedValue({ ok: true, status: 200 });
        const transport = buildTransport({
            headers: { Authorization: "Bearer token" },
        });

        await (transport as any).post("{}");

        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.test/logs",
            expect.objectContaining({
                headers: expect.objectContaining({ Authorization: "Bearer token" }),
            })
        );
    });
});
