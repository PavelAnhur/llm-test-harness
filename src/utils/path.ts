import fs from "fs";
import path from "path";

export function getAbsolutePath(filePath: string): string {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  return absolutePath;
}
