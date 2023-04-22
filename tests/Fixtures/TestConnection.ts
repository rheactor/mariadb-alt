import { Connection } from "@/Connection";
import { ConnectionPool } from "@/ConnectionPool";

type ConnectionOptions = ConstructorParameters<typeof Connection>[0];

type TestConnectionOptions = Omit<ConnectionOptions, "database"> &
  Partial<Pick<ConnectionOptions, "database">>;

const defaultConnection = {
  host: process.env.TESTING_HOST ?? "localhost",
  port: process.env.TESTING_PORT ?? 3306,
  user: process.env.TESTING_USER ?? "root",
  password: process.env.TESTING_PASSWORD,
  database: process.env.TESTING_DATABASE ?? "mariadb-alt",
};

export const TestConnection = (options?: TestConnectionOptions) => {
  const connection = new Connection({
    ...defaultConnection,
    ...(options ?? {}),
  });

  return connection;
};

type ConnectionOptionsPool = ConstructorParameters<typeof ConnectionPool>[0];

type TestConnectionOptionsPool = Omit<ConnectionOptionsPool, "database"> &
  Partial<Pick<ConnectionOptionsPool, "database">>;

export const TestConnectionPool = (options?: TestConnectionOptionsPool) => {
  const connection = new ConnectionPool({
    connections: 2,

    ...defaultConnection,
    ...(options ?? {}),
  });

  return connection;
};
