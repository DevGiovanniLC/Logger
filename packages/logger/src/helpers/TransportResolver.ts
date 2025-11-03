import { ConsoleTransport } from "../Transport/ConsoleTransport";
import { LogTransport, TransportMode } from "../Transport/LogTransport";

export type TransportParam = Array<TransportMode | LogTransport> | LogTransport | TransportMode

export class TransportResolver {

    static resolve(transportParam: TransportParam): LogTransport[] {
        if (transportParam instanceof Array) {
            return this.resolveFromArray(transportParam)
        } else if (typeof transportParam == 'string') {
            return this.resolveFromMode(transportParam)
        }
        return [transportParam] //Transport type
    }

    private static resolveFromArray(transportList: Array<LogTransport | TransportMode>) {
        const transports: LogTransport[] = transportList.filter(
            (transport) => typeof transport !== "string"
        );

        if (transportList.includes("Console"))
            transports.push(new ConsoleTransport());

        if (transportList.includes("ConsoleWithEmojis"))
            transports.push(new ConsoleTransport({ defaultFormaterOptions: { withEmojis: true } }));

        return transports;
    }

    private static resolveFromMode(transportMode: TransportMode) {
        const transports = []

        if (transportMode === "Console")
            transports.push(new ConsoleTransport());

        if (transportMode === "ConsoleWithEmojis")
            transports.push(new ConsoleTransport({ defaultFormaterOptions: { withEmojis: true } }));

        return transports
    }

}
