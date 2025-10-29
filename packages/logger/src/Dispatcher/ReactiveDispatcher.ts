import type { Transport } from "../Transport/Transport";
import { Level } from "../types/Level.type";
import type { Log } from "../types/Log.type";
import type { LogDispatcher } from "./LogDispatcher";

type Scheduler = () => void;

export class ReactiveDispatcher implements LogDispatcher {
    private buffer: Log[] = [];
    private scheduled = false;
    private disposed = false;
    private readonly flushInterval: number;
    private schedule: Scheduler;

    constructor(
        private transports: Transport[],
        private minLevel: Level = Level.Debug,
        options?: { intervalMs?: number; useMessageChannel?: boolean }
    ) {
        this.flushInterval = options?.intervalMs ?? 50;

        if (options?.useMessageChannel !== false && typeof MessageChannel !== "undefined") {
            const ch = new MessageChannel();
            ch.port1.onmessage = () => this.flush();
            this.schedule = () => { if (!this.scheduled) { this.scheduled = true; ch.port2.postMessage(0); } };
        } else {
            let timer: any = null;
            this.schedule = () => {
                if (this.scheduled) return;
                this.scheduled = true;
                timer = setTimeout(() => this.flush(), this.flushInterval);
            };
        }
    }

    dispatch(log: Log): void {
        if (this.disposed) return;
        this.buffer.push(log);
        this.schedule();
    }

    private flush(): void {
        this.scheduled = false;
        if (this.disposed || this.buffer.length === 0) return;

        // copia y limpia para minimizar contención
        const batch = this.buffer.slice();
        this.buffer.length = 0;

        batch.sort((a, b) => a.level - b.level);

        for (const log of batch) {
            if (log.level > this.minLevel) continue;
            for (const t of this.transports) t.log(log);
        }
    }
}
