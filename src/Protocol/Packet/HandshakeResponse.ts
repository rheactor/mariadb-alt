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
  user: string,
  password: string,
  database: string | undefined,
  maxPacketSize: number
) => {
  const bufferAuthentication = password
    ? toStringEncoded(
        hashMySQLNativePassword(authSeed, password).toString("binary")
      )
    : Buffer.from([0]);

  return Buffer.concat([
    createUInt16LE(capabilitiesBase),
    createUInt16LE(capabilitiesExtended),
    createUInt32LE(maxPacketSize),
    Buffer.from([defaultCollation]),
    Buffer.alloc(19),
    createUInt32LE(capabilitiesMariaDB),
    toNullTerminatedStringEscaped(user),
    bufferAuthentication,
    toNullTerminatedStringEscaped(database ?? null),
    toNullTerminatedStringEscaped(authPluginName.toString("binary")),
  ]);
};
