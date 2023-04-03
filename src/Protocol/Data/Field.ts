import { BufferConsumer } from "@/Utils/BufferConsumer";

interface FieldExtended {
  json: boolean;
  uuid: boolean;
}

export interface Field extends FieldExtended {
  type: number;
  name: string;
  collation: number;
  flags: number;
  length: number;
  decimals: number;
}

const readFieldExtended = (bufferConsumer: BufferConsumer) => {
  const extendedMetadataLength = bufferConsumer.readIntEncoded();
  const extendedMetadata: FieldExtended = { json: false, uuid: false };

  if (extendedMetadataLength === 0) {
    return extendedMetadata;
  }

  const extendedBuffer = new BufferConsumer(
    bufferConsumer.slice(Number(extendedMetadataLength))
  );

  while (!extendedBuffer.consumed()) {
    const dataType = extendedBuffer.readInt();
    const dataValue = extendedBuffer.readStringEncoded()!.toString();

    if (dataType === 1 && dataValue === "json") {
      extendedMetadata.json = true;
    } else if (dataType === 0 && dataValue === "uuid") {
      extendedMetadata.uuid = true;
    }
  }

  return extendedMetadata;
};

export const readField = (bufferConsumer: BufferConsumer) => {
  bufferConsumer
    .skip(8) // header + catalog
    .skipStringEncoded() // database
    .skipStringEncoded() // table alias
    .skipStringEncoded(); // table

  const field: Field = {
    name: bufferConsumer.readStringEncoded()!.toString(),
    ...readFieldExtended(bufferConsumer.skipStringEncoded()),
    collation: bufferConsumer.skip(1).readInt(2),
    length: bufferConsumer.readInt(4),
    type: bufferConsumer.readInt(),
    flags: bufferConsumer.readInt(2),
    decimals: bufferConsumer.readInt(),
  };

  bufferConsumer.skip(2);

  return field;
};
