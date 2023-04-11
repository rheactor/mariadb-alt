import { Connection } from "@/Connection";

type ConnectionOptions = ConstructorParameters<typeof Connection>[0];

type TestConnectionOptions = Omit<ConnectionOptions, "database"> &
  Partial<Pick<ConnectionOptions, "database">>;

const defaultConnection = {
  host: process.env.TESTING_HOST ?? "localhost",
  port: process.env.TESTING_PORT ?? 3306,
  user: process.env.TESTING_USER ?? "root",
  password: process.env.TESTING_PASSWORD,
  database: process.env.TESTING_DATABASE ?? "mariadb_alt",
};

const setSQLMode = (connection: Connection) => {
  connection.query(
    'SET SESSION sql_mode = "STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION"'
  );
};

export const TestConnection = (options?: TestConnectionOptions) => {
  const connection = new Connection({
    ...defaultConnection,
    ...(options ?? {}),
  });

  setSQLMode(connection);

  return connection;
};
