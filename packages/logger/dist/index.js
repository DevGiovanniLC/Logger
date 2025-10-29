// src/types/Level.type.ts
var Level = /* @__PURE__ */ ((Level2) => {
  Level2[Level2["Emergency"] = 0] = "Emergency";
  Level2[Level2["Alert"] = 1] = "Alert";
  Level2[Level2["Critical"] = 2] = "Critical";
  Level2[Level2["Error"] = 3] = "Error";
  Level2[Level2["Warning"] = 4] = "Warning";
  Level2[Level2["Notice"] = 5] = "Notice";
  Level2[Level2["Informational"] = 6] = "Informational";
  Level2[Level2["Debug"] = 7] = "Debug";
  return Level2;
})(Level || {});

// src/Transport/ConsoleTransport.ts
var supportsUnicode = () => {
  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    return !/windows nt [0-6]\./.test(ua);
  }
  if (typeof process !== "undefined" && process.stdout) {
    const term = process.env["TERM"] || "";
    const termProgram = process.env["TERM_PROGRAM"] || "";
    return process.platform !== "win32" || term.includes("xterm") || termProgram.includes("vscode") || termProgram.includes("windows terminal");
  }
  return true;
};
var titleLog = supportsUnicode() ? [
  "\u{1F198} EMERGENCY",
  "\u{1F6A8} ALERT",
  "\u{1F534} CRITICAL",
  "\u274C ERROR",
  "\u26A0\uFE0F WARN",
  "\u{1F7E1} NOTICE",
  "\u2139\uFE0F INFO",
  "\u{1F41E} DEBUG"
] : [
  "[!] EMERGENCY",
  "[!] ALERT",
  "[!] CRITICAL",
  "[X] ERROR",
  "[!] WARN",
  "[i] NOTICE",
  "[i] INFO",
  "DEBUG"
];
var FMT = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "medium" });
var ConsoleTransport = class {
  log(log) {
    const text = this.format(log);
    switch (log.level) {
      case 0 /* Emergency */:
      case 1 /* Alert */:
      case 2 /* Critical */:
      case 3 /* Error */:
        console.error(text);
        break;
      case 4 /* Warning */:
        console.warn(text);
        break;
      case 5 /* Notice */:
      case 6 /* Informational */:
        console.info(text);
        break;
      case 7 /* Debug */:
        console.debug(text);
        break;
    }
  }
  format(log) {
    const id = `#${String(log.id).padStart(5, "0")}`;
    return `${id} \u2014 ${titleLog[log.level]} (${log.subject}) \u2014 ${log.message} \u2014 ${FMT.format(log.timeStamp)}`;
  }
};

// src/Dispatcher/SyncDispatcher.ts
var SyncDispatcher = class {
  /**
   * Creates a new synchronous dispatcher.
   * @param transports Array of active transports that will receive log events.
   * @param minLevel Minimum log level to emit. Defaults to `Level.Debug`.
   */
  constructor(transports, minLevel = 7 /* Debug */) {
    this.transports = transports;
    this.minLevel = minLevel;
  }
  /**
   * Dispatches a single log entry to all transports that
   * meet the current severity threshold.
   *
   * @param log The log object to process.
   */
  dispatch(log) {
    for (const t of this.transports) {
      if (this.shouldEmit(log.level)) {
        t.log(log);
      }
    }
  }
  /**
   * Checks whether a log entry should be emitted based
   * on the configured minimum level.
   *
   * @param level Log severity.
   * @returns `true` if the level is within range; otherwise `false`.
   */
  shouldEmit(level) {
    return level <= this.minLevel;
  }
};

// src/Dispatcher/ReactiveDispatcher.ts
var ReactiveDispatcher = class {
  constructor(transports, minLevel = 7 /* Debug */, options) {
    this.transports = transports;
    this.minLevel = minLevel;
    this.flushInterval = options?.intervalMs ?? 50;
    if (options?.useMessageChannel !== false && typeof MessageChannel !== "undefined") {
      const ch = new MessageChannel();
      ch.port1.onmessage = () => this.flush();
      this.schedule = () => {
        if (!this.scheduled) {
          this.scheduled = true;
          ch.port2.postMessage(0);
        }
      };
    } else {
      let timer = null;
      this.schedule = () => {
        if (this.scheduled) return;
        this.scheduled = true;
        timer = setTimeout(() => this.flush(), this.flushInterval);
      };
    }
  }
  buffer = [];
  scheduled = false;
  disposed = false;
  flushInterval;
  schedule;
  dispatch(log) {
    if (this.disposed) return;
    this.buffer.push(log);
    this.schedule();
  }
  flush() {
    this.scheduled = false;
    if (this.disposed || this.buffer.length === 0) return;
    const batch = this.buffer.slice();
    this.buffer.length = 0;
    batch.sort((a, b) => a.level - b.level);
    for (const log of batch) {
      if (log.level > this.minLevel) continue;
      for (const t of this.transports) t.log(log);
    }
  }
};

// src/Logger.ts
var Logger = class {
  /**
   * Creates a new Logger instance.
   * @param options Optional configuration.
   * Defaults: minLevel=Debug, transports=[ConsoleTransport], dispatcher='sync'.
   */
  constructor(options = {
    minLevel: 7 /* Debug */,
    transports: [new ConsoleTransport()],
    dispatcher: "sync"
  }) {
    this.options = options;
    switch (this.options.dispatcher) {
      case "sync":
        this.dispatcher = new SyncDispatcher(this.options.transports, this.options.minLevel);
        break;
      case "reactive":
        this.dispatcher = new ReactiveDispatcher(this.options.transports, this.options.minLevel);
    }
  }
  dispatcher;
  /** Sequential log ID counter. */
  counterID = 0;
  /**
   * Creates a contextual logger tied to a class name or custom string.
   * Each call returns an immutable object with the same log-level API.
   * @param ctx Object or string representing the log context.
   * @returns A frozen `ContextLogger` with contextualized output.
   */
  for(ctx) {
    const subject = typeof ctx === "string" ? ctx : ctx?.constructor?.name ?? "Unknown";
    const emit = (level, message) => this.emit(level, subject, message);
    return Object.freeze({
      emergency: (m) => emit(0 /* Emergency */, m),
      alert: (m) => emit(1 /* Alert */, m),
      critical: (m) => emit(2 /* Critical */, m),
      error: (m) => emit(3 /* Error */, m),
      warn: (m) => emit(4 /* Warning */, m),
      notice: (m) => emit(5 /* Notice */, m),
      info: (m) => emit(6 /* Informational */, m),
      debug: (m) => emit(7 /* Debug */, m)
    });
  }
  /**
   * Level 0 - Emergency: System is unusable. (Catastrophic failure, data loss)
   * @param subject Log subject or category.
   * @param message Detailed event description.
   * @returns Created log object.
   */
  emergency(subject, message) {
    return this.emit(0 /* Emergency */, subject, message);
  }
  /**
   * Level 1 - Alert: Immediate action required. (Critical security or system failure)
   * @param subject Log subject or category.
   * @param message Detailed event description.
   * @returns Created log object.
   */
  alert(subject, message) {
    return this.emit(1 /* Alert */, subject, message);
  }
  /**
   * Level 2 - Critical: Critical condition. (Core component failure)
   * @param subject Log subject or category.
   * @param message Detailed event description.
   * @returns Created log object.
   */
  critical(subject, message) {
    return this.emit(2 /* Critical */, subject, message);
  }
  /**
   * Level 3 - Error: Error condition. (Exception or failed operation)
   * @param subject Log subject or category.
   * @param message Detailed event description.
   * @returns Created log object.
   */
  error(subject, message) {
    return this.emit(3 /* Error */, subject, message);
  }
  /**
   * Level 4 - Warning: Potential risk or degradation.
   * @param subject Log subject or category.
   * @param message Detailed event description.
   * @returns Created log object.
   */
  warn(subject, message) {
    return this.emit(4 /* Warning */, subject, message);
  }
  /**
   * Level 5 - Notice: Significant but normal event. (Configuration change, startup, shutdown)
   * @param subject Log subject or category.
   * @param message Detailed event description.
   * @returns Created log object.
   */
  notice(subject, message) {
    return this.emit(5 /* Notice */, subject, message);
  }
  /**
   * Level 6 - Informational: General informational message.
   * @param subject Log subject or category.
   * @param message Detailed event description.
   * @returns Created log object.
   */
  info(subject, message) {
    return this.emit(6 /* Informational */, subject, message);
  }
  /**
   * Level 7 - Debug: Detailed debug information. (Development diagnostics)
   * @param subject Log subject or category.
   * @param message Detailed event description.
   * @returns Created log object.
   */
  debug(subject, message) {
    return this.emit(7 /* Debug */, subject, message);
  }
  /**
   * Builds an immutable log object with metadata.
   * @param level Severity level.
   * @param subject Log subject or category.
   * @param message Detailed message text.
   * @returns Log object ready to emit.
   */
  build(level, subject, message) {
    return { id: ++this.counterID, level, subject, message, timeStamp: Date.now() };
  }
  /**
   * Sends the log to the dispatcher.
   * @param level Log severity.
   * @param subject Log subject or category.
   * @param message Log content.
   * @returns The emitted `Log` object.
   */
  emit(level, subject, message) {
    const log = this.build(level, subject, message);
    this.dispatcher.dispatch(log);
    return log;
  }
};
export {
  Level,
  Logger
};
