import archiver from "archiver";
import { PassThrough } from "stream";
import type { Mission } from "@droneroute/shared";
import { getKmzExportError, isAir3S } from "@droneroute/shared";
import { buildTemplateKml, buildWaylinesWpml } from "../lib/wpml.js";
import { buildAir3sTemplate, buildAir3sWaylines } from "../lib/air3sWpml.js";

export function generateKmzBuffer(mission: Mission): Promise<Buffer> {
  const error = getKmzExportError(mission);
  if (error) return Promise.reject(new Error(error));
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    const passthrough = new PassThrough();

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);
    archive.on("error", reject);

    archive.pipe(passthrough);

    // Add template.kml
    const air3S = isAir3S(mission.config);
    const prefix = air3S ? "wpmz/" : "";
    const templateKml = air3S
      ? buildAir3sTemplate(mission)
      : buildTemplateKml(mission);
    archive.append(templateKml, { name: `${prefix}template.kml` });

    // Add waylines.wpml
    const waylinesWpml = air3S
      ? buildAir3sWaylines(mission)
      : buildWaylinesWpml(mission);
    archive.append(waylinesWpml, { name: `${prefix}waylines.wpml` });

    // Add empty res/ directory
    if (!air3S) archive.append("", { name: "res/" });

    archive.finalize().catch(reject);
  });
}
