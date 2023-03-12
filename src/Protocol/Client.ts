export const capabilitiesBase =
  // Capabilities.CONNECT_WITH_DB
  0b0000_0000_0000_1000 |
  // Capabilities.CLIENT_PROTOCOL_41
  0b0000_0010_0000_0000 |
  // Capabilities.SECURE_CONNECTION
  0b1000_0000_0000_0000;

export const capabilitiesExtended =
  // Capabilities.PLUGIN_AUTH
  0b0000_0000_0000_1000 |
  // Capabilities.PLUGIN_AUTH_LENENC_CLIENT_DATA
  0b0000_0000_0010_0000;

export const capabilitiesMariaDB = 0;

export const defaultCollation = 0x2d; // utf8mb4_general_ci
