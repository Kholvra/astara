import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const maplibreDist = resolve(process.cwd(), "node_modules/maplibre-gl/dist");
const publicMapDirectory = resolve(process.cwd(), "public/maplibre");
const workerFiles = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

await mkdir(publicMapDirectory, { recursive: true });

await Promise.all(
  workerFiles.map((fileName) =>
    copyFile(
      resolve(maplibreDist, fileName),
      resolve(publicMapDirectory, fileName),
    ),
  ),
);
