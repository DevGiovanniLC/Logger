export abstract class InternalError extends Error {
    public code: string;
    public abstract status: number

    constructor(
        message: string,
    ) {
        super(message)
        this.name = this.constructor.name
    }
}
