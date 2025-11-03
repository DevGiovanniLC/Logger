import { LogTransport } from "../Transport/LogTransport";
import { Level } from "../types/Level.type";
import { Log } from "../types/Log.type";
import { LogDispatcher } from "./LogDispatcher";

const isNode = typeof process !== "undefined" && !!process.versions?.node;

/**
 * Options for {@link ReactiveDispatcher}.
 */
export type Opts = {
    /**
     * Prefer {@link MessageChannel} over `setTimeout` for scheduling.
     * Defaults to `true` in browsers and `false` in Node, unless explicitly set.
     */
    useMessageChannel?: boolean;

    /**
     * Inactivity timeout in milliseconds. When no activity happens for this time,
     * the dispatcher disposes itself and releases timers and channels.
     * @default 5000
     */
    idleMs?: number;

    /**
     * Batch interval in milliseconds for grouping log records before flushing.
     * @default 50
     */
    intervalMs?: number;

    /**
     * If `true`, calls `unref()` on Node timers so they do not keep the event-loop alive.
     * Has no effect in browsers.
     * @default true
     */
    unrefTimers?: boolean;

    /**
     * If `true` in Node, registers a `process.beforeExit` hook to force a final flush+dispose.
     * @default true
     */
    hookBeforeExit?: boolean;
};

/**
 * Reactive log dispatcher that batches log entries and flushes them asynchronously
 * to the configured transports. Supports auto-shutdown on inactivity and
 * Node/browser-safe scheduling.
 *
 * ### Scheduling
 * - Browser: `MessageChannel` by default (does not drift with timers).
 * - Node: `setTimeout` by default; timers can be `unref()`'d to avoid blocking exit.
 *
 * ### Auto-shutdown
 * - Each activity (`dispatch` or `flush`) resets an idle timer.
 * - After `idleMs` with no activity, the dispatcher disposes itself.
 *
 * ### Level filtering
 * - A log is emitted only if its `level <= minLevel`. Adjust if your enum uses a different ordering.
*/
export class ReactiveDispatcher implements LogDispatcher {
    /**
     * In-memory buffer of pending log records.
     * Emptied on each {@link flush}.
     */
    private buffer: Log[] = [];

    /**
     * Guard to avoid scheduling multiple flushes concurrently.
     */
    private scheduled = false;

    /**
     * Indicates that the dispatcher has been disposed and will ignore further work.
     */
    private disposed = false;

    /**
     * Batch interval (ms) between scheduling and {@link flush}.
     */
    private readonly flushInterval: number;

    /**
     * Idle timeout (ms) for auto-disposal.
     */
    private readonly idleTimeout: number;

    /**
     * Whether Node timers should be `unref()`'d to not keep the process alive.
     */
    private readonly unrefTimers: boolean;

    /**
     * Scheduling function used to plan the next {@link flush}.
     * Implemented via `MessageChannel` or `setTimeout`.
     */
    private schedule!: () => void;

    /**
     * Handle for the scheduled flush timer (when using `setTimeout`).
     */
    private timer?: ReturnType<typeof setTimeout>;

    /**
     * Handle for the inactivity timer that triggers {@link dispose}.
     */
    private idleTimer?: ReturnType<typeof setTimeout>;

    /**
     * Handler registered for the Node `beforeExit` hook (when enabled).
     */
    private beforeExitHandler?: () => void;

    /**
     * MessageChannel ports used for browser scheduling.
     * Only defined when `useMessageChannel` is active and available.
     */
    private port1?: MessagePort;

    /**
     * See {@link port1}.
     */
    private port2?: MessagePort;

    /**
     * Create a new {@link ReactiveDispatcher}.
     * @param transports  Destination transports that will receive emitted logs.
     * @param minLevel    Minimum level to emit. A log is emitted when `log.level <= minLevel`.
     * @param opts        Optional behavior configuration. See {@link Opts}.
     */
    constructor(
        private transports: LogTransport[],
        private minLevel: Level = Level.Debug,
        opts?: Opts
    ) {
        this.flushInterval = opts?.intervalMs ?? 50;
        this.idleTimeout = opts?.idleMs ?? 5000;
        this.unrefTimers = opts?.unrefTimers ?? true;

        const useChannel =
            (opts?.useMessageChannel ?? (!isNode && typeof MessageChannel !== "undefined")) &&
            typeof MessageChannel !== "undefined";

        if (useChannel) {
            const ch = new MessageChannel();
            this.port1 = ch.port1;
            this.port2 = ch.port2;

            // Flush runs on the microtask-like callback when the message arrives.
            this.port1.onmessage = () => this.flush();

            // Only schedule if not already scheduled or disposed.
            this.schedule = () => {
                if (!this.scheduled && !this.disposed) {
                    this.scheduled = true;
                    this.port2!.postMessage(0);
                }
            };
        } else {
            // Fallback scheduling with setTimeout (universal; works in Node and browsers).
            this.schedule = () => {
                if (this.scheduled || this.disposed) return;
                this.scheduled = true;
                this.timer = setTimeout(() => this.flush(), this.flushInterval);

                // In Node, allow the process to exit naturally if nothing else is pending.
                if (isNode && this.unrefTimers && typeof (this.timer as any).unref === "function") {
                    (this.timer as any).unref();
                }
            };
        }

        // In Node, ensure a last flush and cleanup just before process exit.
        if (isNode && typeof process?.on === "function" && (opts?.hookBeforeExit ?? true)) {
            this.beforeExitHandler = () => {
                this.flush();
                this.dispose();
            };
            process.on("beforeExit", this.beforeExitHandler);
        }
    }

    /**
     * Enqueue a log entry and schedule a batch flush.
     * No-op after {@link dispose}.
     * @param log The log record to enqueue.
     */
    dispatch(log: Log): void {
        if (this.disposed) return;
        this.buffer.push(log);
        this.schedule();
        this.resetIdleTimer();
    }

    /**
     * Force an immediate synchronous flush of the current buffer.
     * Useful for tests or when you need deterministic output before exit.
     */
    drain(): void {
        this.flush();
    }

    /**
     * Flush the current batch to all transports.
     * Resets the scheduled flag, applies level filtering, and catches transport errors.
     * Re-arms the idle timer after successful processing.
     */
    private flush(): void {
        this.scheduled = false;
        if (this.disposed || this.buffer.length === 0) return;

        // Copy and clear to minimize contention and allow re-entrant dispatch during flush.
        const batch = this.buffer.splice(0);

        for (const log of batch) {
            // Emit only if it passes the configured threshold.
            if (log.level > this.minLevel) continue;

            for (const t of this.transports) {
                try {
                    t.log(log);
                } catch {
                    // Swallow transport errors to avoid blocking subsequent logs.
                }
            }
        }
        this.resetIdleTimer();
    }

    /**
     * Dispose the dispatcher, cancel timers, close channels, and drop any pending entries.
     * After disposal the instance is inert and ignores further calls.
     */
    private dispose(): void {
        if (this.disposed) return;
        this.disposed = true;

        // Drop any pending entries to avoid re-scheduling.
        this.buffer.length = 0;

        // Cancel timers.
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
        if (this.idleTimer) {
            clearTimeout(this.idleTimer);
            this.idleTimer = undefined;
        }

        // Close MessageChannel ports to release event-loop resources.
        if (this.port1) {
            this.port1.onmessage = null as any;
            this.port1.close();
            this.port1 = undefined;
        }
        if (this.port2) {
            this.port2.close();
            this.port2 = undefined;
        }

        if (isNode && this.beforeExitHandler) {
            if (typeof process?.off === "function") {
                process.off("beforeExit", this.beforeExitHandler);
            } else if (typeof process?.removeListener === "function") {
                process.removeListener("beforeExit", this.beforeExitHandler);
            }
            this.beforeExitHandler = undefined;
        }
    }

    /**
     * Restart the inactivity timer. When it fires, the dispatcher is disposed.
     */
    private resetIdleTimer(): void {
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => this.dispose(), this.idleTimeout);

        // In Node, let the process exit even if the idle timer is pending.
        if (isNode && this.unrefTimers && typeof (this.idleTimer as any).unref === "function") {
            (this.idleTimer as any).unref();
        }
    }
}
