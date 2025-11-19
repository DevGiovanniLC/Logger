/*
    RFC 5424
    https://www.rfc-editor.org/rfc/rfc5424.html
    Numerical     Severity
    Code

    0       Emergency: system is unusable
    1       Alert: action must be taken immediately
    2       Critical: critical conditions
    3       Error: error conditions
    4       Warning: warning conditions
    5       Notice: normal but significant condition
    6       Informational: informational messages
    7       Debug: debug-level messages
 */
export enum Level {
    emergency, // System unusable
    alert, // Immediate action required
    critical, // Critical condition
    error, // Error condition
    warning, // Warning condition
    notice, // Significant but normal
    informational, // Informational
    debug, // Debug-level message
    info = informational, //Alias
}

/** Keys that map to high-severity logging helpers. */
export type ErrorLevelKey = 'emergency' | 'alert' | 'critical' | 'error';

/** Keys that map to informational logging helpers. */
export type InfoLevelKey = 'warn' | 'notice' | 'info' | 'debug';

/** Error-level helper entries paired with their severity indices. */
export const ERROR_LEVEL_ENTRIES: ReadonlyArray<[ErrorLevelKey, Level]> = [
    ['emergency', Level.emergency],
    ['alert', Level.alert],
    ['critical', Level.critical],
    ['error', Level.error],
];

/** Info-level helper entries paired with their severity indices. */
export const INFO_LEVEL_ENTRIES: ReadonlyArray<[InfoLevelKey, Level]> = [
    ['warn', Level.warning],
    ['notice', Level.notice],
    ['info', Level.informational],
    ['debug', Level.debug],
];
