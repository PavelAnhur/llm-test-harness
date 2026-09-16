import fs from "fs";
import { getAbsolutePath } from "./path";

export function readJsonFile<T = unknown>(filePath: string): T {
  const absolutePath = getAbsolutePath(filePath);
  const fileContent = fs.readFileSync(absolutePath, "utf-8");
  if (!fileContent.trim()) {
    throw new Error(`JSON file is empty: ${absolutePath}`);
  }
  try {
    return JSON.parse(fileContent) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse JSON file ${absolutePath}`, {
        cause: error,
      });
    }
    throw error;
  }
}
