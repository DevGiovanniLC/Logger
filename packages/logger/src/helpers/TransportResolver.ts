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

        if (transportList.includes("console"))
            transports.push(new ConsoleTransport());

        if (transportList.includes("console-emoji"))
            transports.push(new ConsoleTransport({ defaultFormaterOptions: { withEmojis: true } }));

        if (transportList.includes("console-color"))
            transports.push(new ConsoleTransport({ defaultFormaterOptions: { color: true } }));

        if (transportList.includes("console-styled"))
            transports.push(new ConsoleTransport({ defaultFormaterOptions: { color: true, withEmojis: true } }));

        return transports;
    }

    private static resolveFromMode(transportMode: TransportMode) {
        const transports = []

        switch (transportMode) {
            case "console":
                transports.push(new ConsoleTransport());
                break
            case "console-emoji":
                transports.push(new ConsoleTransport({ defaultFormaterOptions: { withEmojis: true } }));
                break
            case "console-color":
                transports.push(new ConsoleTransport({ defaultFormaterOptions: { color: true } }));
                break
            case "console-styled":
                transports.push(new ConsoleTransport({ defaultFormaterOptions: { color: true, withEmojis: true } }));
                break
        }

        return transports
    }

}
