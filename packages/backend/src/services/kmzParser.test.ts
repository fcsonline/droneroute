import { describe, it, expect } from "vitest";
import { parseKmz } from "./kmzParser.js";

describe("area templates from DJI Pilot 2", () => {
  it("reads the waypoints from waylines.wpml when template.kml has no points", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file(
      "wpmz/template.kml",
      `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6"><Document>
<wpml:missionConfig><wpml:droneInfo><wpml:droneEnumValue>99</wpml:droneEnumValue><wpml:droneSubEnumValue>0</wpml:droneSubEnumValue></wpml:droneInfo>
<wpml:payloadInfo><wpml:payloadEnumValue>89</wpml:payloadEnumValue></wpml:payloadInfo></wpml:missionConfig>
<Folder><wpml:templateType>mappingCylinder</wpml:templateType><Placemark><wpml:cylinderRadius>20</wpml:cylinderRadius></Placemark></Folder>
</Document></kml>`,
    );
    zip.file(
      "wpmz/waylines.wpml",
      `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6"><Document><Folder>
<wpml:autoFlightSpeed>8</wpml:autoFlightSpeed>
<Placemark><Point><coordinates>8.59,49.16</coordinates></Point><wpml:index>0</wpml:index><wpml:executeHeight>60</wpml:executeHeight></Placemark>
<Placemark><Point><coordinates>8.591,49.161</coordinates></Point><wpml:index>1</wpml:index><wpml:executeHeight>70</wpml:executeHeight></Placemark>
</Folder></Document></kml>`,
    );
    const parsed = await parseKmz(
      await zip.generateAsync({ type: "nodebuffer" }),
    );
    expect(
      parsed.waypoints.map((w) => [w.longitude, w.latitude, w.height]),
    ).toEqual([
      [8.59, 49.16, 60],
      [8.591, 49.161, 70],
    ]);
  });
});
