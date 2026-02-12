import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { Alias } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(__dirname, "../../packages");

export function getSpooshAliases(): Alias[] {
  const packageDirs = fs.readdirSync(packagesDir).filter((dir) => {
    const pkgJsonPath = path.join(packagesDir, dir, "package.json");
    return fs.existsSync(pkgJsonPath);
  });

  return packageDirs.map((dir) => {
    const pkgJsonPath = path.join(packagesDir, dir, "package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    const packageName = pkgJson.name as string;

    return {
      find: packageName,
      replacement: path.join(packagesDir, dir, "src/index.ts"),
    };
  });
}
