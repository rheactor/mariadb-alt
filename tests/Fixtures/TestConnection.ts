import { Connection } from "@/Connection";

export const TestConnection = (
  options?: ConstructorParameters<typeof Connection>[0]
) =>
  new Connection({
    host: process.env.TESTING_HOST,
    port: process.env.TESTING_PORT,
    ...(options ?? {}),
  });
