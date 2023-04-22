/** @see https://mariadb.com/kb/en/connection/#capabilities */
export const Capabilities = {
  // Capabilities #1.
  CLIENT_MYSQL: 1n << 0n,
  FOUND_ROWS: 1n << 1n,
  CONNECT_WITH_DB: 1n << 3n,
  COMPRESS: 1n << 5n,
  LOCAL_FILES: 1n << 7n,
  CLIENT_PROTOCOL_41: 1n << 9n,
  CLIENT_INTERACTIVE: 1n << 10n,
  SSL: 1n << 11n,
  TRANSACTIONS: 1n << 13n,
  SECURE_CONNECTION: 1n << 15n,

  // Capabilities #2.
  MULTI_STATEMENTS: 1n << 16n,
  MULTI_RESULTS: 1n << 17n,
  PS_MULTI_RESULTS: 1n << 18n,
  PLUGIN_AUTH: 1n << 19n,
  CONNECT_ATTRS: 1n << 20n,
  PLUGIN_AUTH_LENENC_CLIENT_DATA: 1n << 21n,
  CLIENT_CAN_HANDLE_EXPIRED_PASSWORDS: 1n << 22n,
  CLIENT_SESSION_TRACK: 1n << 23n,
  CLIENT_DEPRECATE_EOF: 1n << 24n,
  CLIENT_ZSTD_COMPRESSION_ALGORITHM: 1n << 26n,
  CLIENT_CAPABILITY_EXTENSION: 1n << 29n,
  CLIENT_SSL_VERIFY_SERVER_CERT: 1n << 30n,
  CLIENT_REMEMBER_OPTIONS: 1n << 31n,

  // Capabilities #3.
  MARIADB_CLIENT_PROGRESS: 1n << 32n,
  MARIADB_CLIENT_RESERVED_1: 1n << 33n,
  MARIADB_CLIENT_STMT_BULK_OPERATIONS: 1n << 34n,
  MARIADB_CLIENT_EXTENDED_METADATA: 1n << 35n,
  MARIADB_CLIENT_CACHE_METADATA: 1n << 36n,
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

export const Collations = {
  [`utf8mb4_general_ci`]: 0x2d,
  binary: 0x3f,
};
