/** @see https://mariadb.com/kb/en/connection/#capabilities */
export declare const CapabilitiesBase: {
    CLIENT_MYSQL: number;
    FOUND_ROWS: number;
    CONNECT_WITH_DB: number;
    COMPRESS: number;
    LOCAL_FILES: number;
    CLIENT_PROTOCOL_41: number;
    CLIENT_INTERACTIVE: number;
    SSL: number;
    TRANSACTIONS: number;
    SECURE_CONNECTION: number;
};
export declare const CapabilitiesExtended: {
    MULTI_STATEMENTS: number;
    MULTI_RESULTS: number;
    PS_MULTI_RESULTS: number;
    PLUGIN_AUTH: number;
    CONNECT_ATTRS: number;
    PLUGIN_AUTH_LENENC_CLIENT_DATA: number;
    CLIENT_CAN_HANDLE_EXPIRED_PASSWORDS: number;
    CLIENT_SESSION_TRACK: number;
    CLIENT_DEPRECATE_EOF: number;
    CLIENT_ZSTD_COMPRESSION_ALGORITHM: number;
    CLIENT_CAPABILITY_EXTENSION: number;
    CLIENT_SSL_VERIFY_SERVER_CERT: number;
    CLIENT_REMEMBER_OPTIONS: number;
};
export declare const CapabilitiesMariaDB: {
    MARIADB_CLIENT_PROGRESS: number;
    MARIADB_CLIENT_RESERVED_1: number;
    MARIADB_CLIENT_STMT_BULK_OPERATIONS: number;
    MARIADB_CLIENT_EXTENDED_METADATA: number;
    MARIADB_CLIENT_CACHE_METADATA: number;
};
/** @see https://mariadb.com/kb/en/result-set-packets/#field-types */
export declare const FieldTypes: {
    TINYINT: number;
    SMALLINT: number;
    MEDIUMINT: number;
    INT: number;
    BIGINT: number;
    FLOAT: number;
    DOUBLE: number;
    DECIMAL: number;
    DATETIME: number;
    DATE: number;
    TIME: number;
    TIMESTAMP: number;
    YEAR: number;
    VARCHAR: number;
    CHAR: number;
    BLOB: number;
    LONGBLOB: number;
    BIT: number;
    NULL: number;
};
/** @see https://mariadb.com/kb/en/result-set-packets/#field-details-flag */
export declare const FieldFlags: {
    NOT_NULL: number;
    PRIMARY_KEY: number;
    UNIQUE_KEY: number;
    MULTIPLE_KEY: number;
    BLOB: number;
    UNSIGNED: number;
    ZEROFILL_FLAG: number;
    BINARY_COLLATION: number;
    ENUM: number;
    AUTO_INCREMENT: number;
    TIMESTAMP: number;
    SET: number;
    NO_DEFAULT_VALUE_FLAG: number;
    ON_UPDATE_NOW_FLAG: number;
    NUM_FLAG: number;
};
/** @see https://dev.mysql.com/doc/dev/mysql-server/latest/mysql__com_8h.html#a1d854e841086925be1883e4d7b4e8cad */
export declare const ServerStatus: {
    IN_TRANSACTION: number;
    AUTO_COMMIT: number;
    MORE_RESULTS: number;
    BAD_INDEX_USED: number;
    NO_INDEX_USED: number;
    CURSOR_EXISTS: number;
    LAST_ROW_SENT: number;
    DATABASE_DROPPED: number;
    NO_BACKSLASH_ESCAPES: number;
    METADATA_CHANGED: number;
    QUERY_WAS_SLOW: number;
    PS_OUT_PARAMS: number;
    IN_TRANS_READONLY: number;
    SESSION_STATE_CHANGED: number;
};
export declare const Collations: {
    utf8mb4_general_ci: number;
    binary: number;
};
