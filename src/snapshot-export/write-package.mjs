import { link, mkdir, open, rm, stat } from "node:fs/promises";
import path from "node:path";

export async function writePackage(snapshot, outputPath) {
  const destination = path.resolve(outputPath);
  try { await stat(destination); throw new Error(`Arquivo de destino já existe: ${destination}`); } catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${snapshot.packageId}.tmp`;
  let handle;
  try {
    handle = await open(temporary, "wx", 0o600);
    await handle.writeFile(`${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    await handle.sync();
    await handle.close(); handle = null;
    await link(temporary, destination);
    await rm(temporary);
  } catch (error) {
    if (handle) await handle.close();
    await rm(temporary, { force: true });
    throw error;
  }
  return destination;
}
