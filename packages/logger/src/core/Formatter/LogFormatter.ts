import { Log } from "@models/Log.type";

/**
 * Contract implemented by components that transform logs into displayable strings.
 */
export interface LogFormatter {
    /**
     * Convert a structured log into a renderable string.
     * @param log Log entry with metadata and normalized message.
     */
    format(log: Log): string;
}
