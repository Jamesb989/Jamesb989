import { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const ignoreFile = fs.readFileSync(new URL(".eslintignore", import.meta.url), "utf8");
const ignores = ignoreFile
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter(Boolean);

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores,
  },
];

export default eslintConfig;
