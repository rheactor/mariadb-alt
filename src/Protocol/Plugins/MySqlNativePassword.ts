import { createHash } from "node:crypto";

import { bufferXOR } from "@/Utils/BufferUtil.js";

export function hashMySQLNativePassword(
  authenticationSeed: Buffer,
  password: string,
) {
  const passwordHash = createHash("sha1").update(password).digest();
  const concatHash = createHash("sha1")
    .update(
      Buffer.concat([
        authenticationSeed,
        createHash("sha1").update(passwordHash).digest(),
      ]),
    )
    .digest();

  return bufferXOR(passwordHash, concatHash);
}
