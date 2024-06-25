import type { ConnectionOptions } from "@/Connection.js";
export declare function createHandshakeResponse(authSeed: Buffer, authPluginName: Buffer, options: Pick<ConnectionOptions, "database" | "password" | "user">, maxPacketSize: number): Buffer;
