/**
 * An error that carries an HTTP status and a message that is safe to return
 * to the client. Never put tokens, stack traces or internal error text in
 * `message`.
 */
export class HttpError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = "HttpError";
        this.status = status;
    }
}
