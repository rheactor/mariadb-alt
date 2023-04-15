import { cwd } from "node:process";

export const delay = async (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const getTestName = (filename: string) =>
  filename
    .substring(cwd().length + 7)
    .replace(/\.test\.ts/, "")
    .replaceAll("\\", "/");
