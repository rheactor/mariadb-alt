import {
  CapabilitiesBase,
  CapabilitiesExtended,
  CapabilitiesMariaDB,
} from "@/Protocol/Enumerations";

export const capabilitiesBase =
  CapabilitiesBase.CONNECT_WITH_DB |
  CapabilitiesBase.CLIENT_PROTOCOL_41 |
  CapabilitiesBase.SECURE_CONNECTION;

export const capabilitiesExtended =
  CapabilitiesExtended.PLUGIN_AUTH |
  CapabilitiesExtended.PLUGIN_AUTH_LENENC_CLIENT_DATA;

export const capabilitiesMariaDB =
  CapabilitiesMariaDB.MARIADB_CLIENT_EXTENDED_METADATA;

export const defaultCollation = 0x2d; // utf8mb4_general_ci
