import { ConsoleTransport } from "../Transport/ConsoleTransport";
import { Transport, TransportMode } from "../Transport/Transport";

export type TransportParam = Array<TransportMode | Transport> | Transport | TransportMode

export class TransportResolver {

    static resolve(transportParam: TransportParam): Transport[] {
        if (transportParam instanceof Array) {
            return this.resolveFromArray(transportParam)
        } else if (typeof transportParam == 'string') {
            return this.resolveFromMode(transportParam)
        }
        return [transportParam] //Transport type
    }

    private static resolveFromArray(transportList: Array<Transport | TransportMode>) {
        const transports: Transport[] = transportList.filter(
            (transport) => typeof transport !== "string"
        );

        if (transportList.includes("Console"))
            transports.push(new ConsoleTransport());

        if (transportList.includes("ConsoleWithEmojis"))
            transports.push(new ConsoleTransport({ withEmojis: true }));

        return transports;
    }

    private static resolveFromMode(transportMode: TransportMode) {
        const transports = []

        if (transportMode === "Console")
            transports.push(new ConsoleTransport());

        if (transportMode === "ConsoleWithEmojis")
            transports.push(new ConsoleTransport({ withEmojis: true }));

        return transports
    }

}
