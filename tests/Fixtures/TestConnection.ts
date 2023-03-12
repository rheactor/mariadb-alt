import { Connection } from "@/Connection";

export const TestConnection = (
  options?: ConstructorParameters<typeof Connection>[0]
) =>
  new Connection({
    host: process.env.TESTING_HOST ?? "localhost",
    port: process.env.TESTING_PORT ?? 3306,
    user: process.env.TESTING_USER ?? "root",
    password: process.env.TESTING_PASSWORD,
    database: process.env.TESTING_DATABASE ?? "test-rev",
    ...(options ?? {}),
  });
