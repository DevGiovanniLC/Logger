import { errorThrower } from "./handlers/HandlersFuncts"
import { InternalError } from "./InternalError"

export class LoggerError extends InternalError {
    public status: number = 10

    constructor(
        message: string,
        public code = 'Logger Error',
        status = 0
    ) {
        super(message)
        this.name = this.constructor.name
        this.status += status
    }
}

export function requireMetrics(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new LoggerError(
            'You have to enable metrics to use them',
            'METRICS_DISABLED',
            1
        )
    )
}

export function OnUpdateCallbackError(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new LoggerError(
            ' Callback function onUpdate failed',
            'ON_UPDATE_CALLBACK_FAILED',
            2
        )
    )
}


//-------------------------------------------------------------


export class AppLoggerError extends InternalError {
    public status: number = 20

    constructor(
        message: string,
        public code = 'AppLogger Error',
        status = 0
    ) {
        super(message)
        this.name = this.constructor.name
        this.status += status
    }
}

export function requireInitialization(boundary: Function | Object): never {
    return errorThrower(
        boundary,
        new AppLoggerError(
            'AppLogger.init() requested',
            'REQUIRE_INITIALIZATION',
            1
        )
    )
}
