import { Connection } from "@/Connection";

type ConnectionOptions = ConstructorParameters<typeof Connection>[0];

type TestConnectionOptions = Omit<ConnectionOptions, "database"> &
  Partial<Pick<ConnectionOptions, "database">>;

export const TestConnection = (options?: TestConnectionOptions) =>
  new Connection({
    host: process.env.TESTING_HOST ?? "localhost",
    port: process.env.TESTING_PORT ?? 3306,
    user: process.env.TESTING_USER ?? "root",
    password: process.env.TESTING_PASSWORD,
    database: process.env.TESTING_DATABASE ?? "mariadb_alt",
    ...(options ?? {}),
  });
