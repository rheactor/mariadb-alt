/** @see https://mariadb.com/kb/en/connection/#capabilities */
export const CapabilitiesBase = {
  CLIENT_MYSQL: 1 << 0,
  FOUND_ROWS: 1 << 1,
  CONNECT_WITH_DB: 1 << 3,
  // UNUSED: 1 << 4,
  COMPRESS: 1 << 5,
  // UNUSED: 1 << 6,
  LOCAL_FILES: 1 << 7,
  // UNUSED: 1 << 8,
  CLIENT_PROTOCOL_41: 1 << 9,
  CLIENT_INTERACTIVE: 1 << 10,
  SSL: 1 << 11,
  // UNUSED: 1 << 12,
  TRANSACTIONS: 1 << 13,
  // UNUSED: 1 << 14,
  SECURE_CONNECTION: 1 << 15,
};

export const CapabilitiesExtended = {
  MULTI_STATEMENTS: 1 << 0,
  MULTI_RESULTS: 1 << 1,
  PS_MULTI_RESULTS: 1 << 2,
  PLUGIN_AUTH: 1 << 3,
  CONNECT_ATTRS: 1 << 4,
  PLUGIN_AUTH_LENENC_CLIENT_DATA: 1 << 5,
  CLIENT_CAN_HANDLE_EXPIRED_PASSWORDS: 1 << 6,
  CLIENT_SESSION_TRACK: 1 << 7,
  CLIENT_DEPRECATE_EOF: 1 << 8,
  // UNUSED: 1 << 9,
  CLIENT_ZSTD_COMPRESSION_ALGORITHM: 1 << 10,
  // UNUSED: 1 << 11,
  // UNUSED: 1 << 12,
  CLIENT_CAPABILITY_EXTENSION: 1 << 13,
  CLIENT_SSL_VERIFY_SERVER_CERT: 1 << 14,
  CLIENT_REMEMBER_OPTIONS: 1 << 15,
};

export const CapabilitiesMariaDB = {
  MARIADB_CLIENT_PROGRESS: 1 << 0,
  MARIADB_CLIENT_RESERVED_1: 1 << 1,
  MARIADB_CLIENT_STMT_BULK_OPERATIONS: 1 << 2,
  MARIADB_CLIENT_EXTENDED_METADATA: 1 << 3,
  MARIADB_CLIENT_CACHE_METADATA: 1 << 4,
};

/** @see https://mariadb.com/kb/en/result-set-packets/#field-types */
export const FieldTypes = {
  TINYINT: 1,
  SMALLINT: 2,
  MEDIUMINT: 9,
  INT: 3,
  BIGINT: 8,

  FLOAT: 4,
  DOUBLE: 5,
  DECIMAL: 246,

  DATETIME: 12,
  DATE: 10,
  TIME: 11,
  TIMESTAMP: 7,
  YEAR: 13,

  VARCHAR: 253,
  CHAR: 254,
  BLOB: 252,
  LONGBLOB: 251,

  BIT: 16,

  NULL: 6,
};

/** @see https://mariadb.com/kb/en/result-set-packets/#field-details-flag */
export const FieldFlags = {
  NOT_NULL: 1,
  PRIMARY_KEY: 2,
  UNIQUE_KEY: 4,
  MULTIPLE_KEY: 8,
  //
  BLOB: 16,
  UNSIGNED: 32,
  ZEROFILL_FLAG: 64,
  BINARY_COLLATION: 128,
  //
  ENUM: 256,
  AUTO_INCREMENT: 512,
  TIMESTAMP: 1024,
  SET: 2048,
  //
  NO_DEFAULT_VALUE_FLAG: 4096,
  ON_UPDATE_NOW_FLAG: 8192,
  NUM_FLAG: 32768,
};

/** @see https://dev.mysql.com/doc/dev/mysql-server/latest/mysql__com_8h.html#a1d854e841086925be1883e4d7b4e8cad */
export const ServerStatus = {
  IN_TRANSACTION: 1 << 0,
  AUTO_COMMIT: 1 << 1,
  // UNUSED: 1 << 2,
  MORE_RESULTS: 1 << 3,
  BAD_INDEX_USED: 1 << 4,
  NO_INDEX_USED: 1 << 5,
  CURSOR_EXISTS: 1 << 6,
  LAST_ROW_SENT: 1 << 7,
  DATABASE_DROPPED: 1 << 8,
  NO_BACKSLASH_ESCAPES: 1 << 9,
  METADATA_CHANGED: 1 << 10,
  QUERY_WAS_SLOW: 1 << 11,
  PS_OUT_PARAMS: 1 << 12,
  IN_TRANS_READONLY: 1 << 13,
  SESSION_STATE_CHANGED: 1 << 14,
  // UNUSED: 1 << 15,
};

export const Collations = {
  [`utf8mb4_general_ci`]: 0x2d,
  binary: 0x3f,
};
