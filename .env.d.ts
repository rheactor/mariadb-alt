declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TESTING_DATABASE: string;
      TESTING_USER: string;
      TESTING_PASSWORD: string;
    }
  }
}
