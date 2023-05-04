import {
  CapabilitiesBase,
  CapabilitiesExtended,
  CapabilitiesMariaDB,
  Collations,
} from "@/Protocol/Enumerations";

export const capabilitiesBase =
  CapabilitiesBase.CONNECT_WITH_DB |
  CapabilitiesBase.CLIENT_PROTOCOL_41 |
  CapabilitiesBase.SECURE_CONNECTION;

export const capabilitiesExtended =
  CapabilitiesExtended.MULTI_STATEMENTS |
  CapabilitiesExtended.MULTI_RESULTS |
  CapabilitiesExtended.PLUGIN_AUTH |
  CapabilitiesExtended.PLUGIN_AUTH_LENENC_CLIENT_DATA;

export const capabilitiesMariaDB =
  CapabilitiesMariaDB.MARIADB_CLIENT_EXTENDED_METADATA;

export const defaultCollation = Collations.utf8mb4_general_ci;
