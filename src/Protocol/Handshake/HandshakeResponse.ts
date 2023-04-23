import { type ConnectionOptions } from "@/Connection";
import {
  capabilitiesBase,
  capabilitiesExtended,
  capabilitiesMariaDB,
  defaultCollation,
} from "@/Protocol/Client";
import { hashMySQLNativePassword } from "@/Protocol/Plugins/MySQLNativePassword";
import {
  createUInt16LE,
  createUInt32LE,
  toNullTerminatedStringEscaped,
  toStringEncoded,
} from "@/Utils/BufferUtil";

export const createHandshakeResponse = (
  authSeed: Buffer,
  authPluginName: Buffer,
  options: Pick<ConnectionOptions, "database" | "password" | "user">,
  maxPacketSize: number
) => {
  const bufferAuthentication =
    options.password === undefined || options.password === ""
      ? Buffer.from([0])
      : toStringEncoded(
          hashMySQLNativePassword(authSeed, options.password).toString("binary")
        );

  return Buffer.concat([
    createUInt16LE(capabilitiesBase),
    createUInt16LE(capabilitiesExtended),
    createUInt32LE(maxPacketSize),
    Buffer.from([defaultCollation]),
    Buffer.alloc(19),
    createUInt32LE(capabilitiesMariaDB),
    toNullTerminatedStringEscaped(options.user),
    bufferAuthentication,
    toNullTerminatedStringEscaped(options.database),
    toNullTerminatedStringEscaped(authPluginName.toString("binary")),
  ]);
};
