import { BufferConsumer } from "@/Utils/BufferConsumer";

export class Handshake {
  /** DBMS protocol version (eg. MariaDB 10.x === 10). */
  public protocolVersion: number;

  /** DBMS server version (eg. "5.5.5-10.11.2-MariaDB"). */
  public serverVersion: Buffer;

  /** Connection ID 32-byte. */
  public connectionId: number;

  /** Authentication seed 8-bytes (Scramble #1). */
  public authSeed: Buffer;

  /** Authentication plugin name. */
  public authPluginName: Buffer;

  /** Length of auth_plugin_data (scramble) if greater than 0 and capabilities has CLIENT_PLUGIN_AUTH. */
  public authPluginNameLength: number;

  /** Server capabilities. */
  public capabilities: bigint;

  /** Server default collation. */
  public defaultCollation: number;

  /** Server status. */
  public serverStatus: number;

  public constructor(data: Buffer) {
    const bufferConsumer = new BufferConsumer(data);

    /** @see https://mariadb.com/kb/en/connection/#initial-handshake-packet */
    this.protocolVersion = bufferConsumer.readUInt();
    this.serverVersion = bufferConsumer.readNullTerminatedString();
    this.connectionId = bufferConsumer.readUInt(4);
    this.authSeed = bufferConsumer.readString(8, true);
    this.capabilities = BigInt(bufferConsumer.readUInt(2));
    this.defaultCollation = bufferConsumer.readUInt();
    this.serverStatus = bufferConsumer.readUInt(2);
    this.capabilities += BigInt(bufferConsumer.readUInt(2)) << 16n;
    this.authPluginNameLength = bufferConsumer.readUInt();
    bufferConsumer.skip(6);
    this.capabilities += BigInt(bufferConsumer.readUInt(4)) << 32n;

    this.authSeed = Buffer.concat([
      this.authSeed,
      bufferConsumer.readString(
        Math.max(12, this.authPluginNameLength - 9),
        true
      ),
    ]);

    this.authPluginName = bufferConsumer.readNullTerminatedString();
  }
}
