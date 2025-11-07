import { LogFormatter } from "@core/Formatter";
import { DefaultFormatter, FormatterParams } from "@core/Formatter/DefaultFormatter";
import { Log } from "@models/Log.type";

/**
 * Configuration for {@link LogTransport}.
 */
export type TransportParams = {
    formatter?: LogFormatter
    defaultFormaterOptions?: FormatterParams
}


/**
 * Transport abstraction that delivers formatted logs to an output.
 *
 * Provides lifecycle helpers (enable/disable) and a template method (`emit`)
 * so subclasses only focus on the actual delivery implementation.
 */
export abstract class LogTransport {

    protected readonly formatter: LogFormatter

    /**
     * @param name Identifier used for debugging/metrics.
     * @param enabled Initial enabled state.
     */
    protected constructor(
        private readonly name: string = "log-transport",
        formatterParams: TransportParams,
        private enabled = true
    ) {
        this.formatter = formatterParams.formatter ?? new DefaultFormatter(formatterParams?.defaultFormaterOptions)
    }

    /**
     * Public entry point used by dispatchers.
     * Performs guards before delegating to the concrete transport.
     */
    public emit(log: Log): void {
        if (!this.enabled) return;
        if (!this.shouldEmit(log)) return;
        this.performEmit(log);
    }

    /**
     * Turn on the transport without reinstantiation.
     */
    public enable(): void {
        this.enabled = true;
    }

    /**
     * Temporarily disable the transport.
     */
    public disable(): void {
        this.enabled = false;
    }

    /**
     * Expose the transport identifier for diagnostics.
     */
    public get transportName(): string {
        return this.name;
    }

    /**
     * Hook that allows subclasses to skip emitting certain logs.
     */
    protected shouldEmit(_log: Log): boolean {
        return true;
    }

    /**
     * Concrete transports must implement the delivery mechanics.
     */
    protected abstract performEmit(log: Log): void;
}

/**
 * Built-in transport modes resolved by {@link TransportResolver}.
 */
export type TransportMode = 'console' | 'console-emoji' | 'console-color' | 'console-styled'
