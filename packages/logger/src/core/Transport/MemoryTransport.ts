import { Log } from "@models/Log.type";
import { LogTransport, TransportParams } from "./LogTransport";

export class MemoryTransport extends LogTransport {
    private readonly _logs: string[] = []
    public get logs() {
        return this._logs
    }

    constructor(transportParams?: TransportParams) {
        super('memory', transportParams)
    }

    protected performEmit(log: Log): void {
        const text = this.formatter.format(log)
        this.logs.push(text)
    }

}
