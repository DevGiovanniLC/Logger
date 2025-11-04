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
    Emergency, // System unusable
    Alert,     // Immediate action required
    Critical,  // Critical condition
    Error,     // Error condition
    Warning, // Warning condition
    Notice,    // Significant but normal
    Informational, // Informational
    Debug   // Debug-level message
}

