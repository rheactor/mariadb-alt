declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TESTING_HOST: string;
      TESTING_PORT: number;
      TESTING_DATABASE: string;
      TESTING_USER: string;
      TESTING_PASSWORD: string;
    }
  }
}

export {};
