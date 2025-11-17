import { Log } from "@models/Log.type";
import { LogTransport, TransportParams } from "./LogTransport";
import fs from "fs";
import * as path from "path";


/**
 * Additional configuration specific to {@link FileTransport}.
 */
export type FileTransportParams = string | TransportParams & {
    filePath?: string
}

/**
 * Transport that persists each formatted log entry into a file.
 *
 * It creates the target directory (default `.logs/`) when instantiated
 * and appends every log synchronously so callers know the write succeeded
 * (or failed) before continuing.
 */
export class FileTransport extends LogTransport {
    protected dirPath: string;
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

    /**
     * Resolve runtime configuration (directory + file name) and ensure the path exists.
     */
    private setup(filepath: string | undefined) {
        this.dirPath = this.resolveDirectory(filepath)
        this.filePath = this.buildFileName(this.dirPath)
        this.ensureDirectory(path.dirname(this.filePath))
    }

    /**
     * Append the formatted log entry to the backing file.
     */
    protected performEmit(log: Log): void {
        this.appendLine(`${this.formatter.format(log)}\n`)
    }

    /**
     * Normalize the desired directory and guarantee a trailing separator.
     */
    private resolveDirectory(filePath: string | undefined): string {
        if (filePath === undefined) return '.logs/'
        const normalized = path.normalize(filePath);
        return normalized.endsWith(path.sep) ? normalized : `${normalized}${path.sep}`;
    }

    /**
     * Create the directory tree on demand.
     */
    private ensureDirectory(targetDir: string) {
        fs.mkdirSync(targetDir, { recursive: true })
    }

    /**
     * Append the chunk at the end of the current log file.
     * Throws if the write fails so callers notice transport errors instantly.
     */
    private appendLine(chunk: string) {
        fs.appendFileSync(this.filePath, chunk)
    }

    /**
     * Generate a deterministic file name grouped by date.
     */
    private buildFileName(dirpath: string): string {
        const actualDate = new Date().toISOString().slice(0, 10)
        const datedDir = path.join(dirpath, actualDate)
        return path.join(datedDir, `log-${Date.now()}.txt`)
    }
}
