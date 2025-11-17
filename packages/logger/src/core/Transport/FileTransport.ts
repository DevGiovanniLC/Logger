import { Log } from "@models/Log.type";
import { LogTransport, TransportParams } from "./LogTransport";
import { once } from "events";
import fs from "fs"


/**
 * Additional configuration specific to {@link FileTransport}.
 */
export type FileTransportParams = string | TransportParams & {
    filePath?: string
}

export class FileTransport extends LogTransport {
    protected dirPath: string;
    protected stream: fs.WriteStream;
    protected filePath: string;

    constructor(transportParams?: FileTransportParams) {

        if (typeof transportParams == 'string') {
            super('file')
            this.setup(transportParams)
            return;
        }

        super('file', transportParams)
        this.setup(transportParams?.filePath)
    }

    private setup(filepath: string | undefined) {
        this.dirPath = this.formatPath(filepath) ?? '.logs/'
        this.filePath = this.buildFileName(this.dirPath)

        this.open(this.filePath)
        const close = () => this.close()
        process.once("beforeExit", close)
        process.once("SIGINT", () => { close(); process.exit(130) })
    }

    protected async performEmit(log: Log): Promise<void> {
        const line = this.formatter.format(log) + "\n"
        const ok = this.stream.write(line)
        if (!ok) {
            await once(this.stream, "drain");
        }
    }

    private open(filePath: string) {
        fs.mkdirSync(this.dirPath, { recursive: true })
        this.stream = fs.createWriteStream(filePath, { flags: "a" })
        this.stream.on("error", (e) => {
            throw e
        })
    }

    private close() {
        if (this.stream && !this.stream.closed) {
            try { this.stream.end() } catch { /* no-op */ }
        }
    }

    private formatPath(path: string): string | undefined {
        if (path === undefined) return undefined;
        if (path.endsWith('/') || path.endsWith('\\')) return path;
        return `${path}/`;
    }

    private buildFileName(dirpath: string): string {
        const actualDate = new Date().toISOString().slice(0, 9)
        return `${dirpath}log-(${actualDate})-${Date.now()}.txt`
    }
}
