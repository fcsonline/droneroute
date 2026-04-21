#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { program } from "commander";
import chalk from "chalk";
import { detectDevices, selectDevice } from "./device.js";
import { uploadKmz } from "./upload.js";
import { isAdbAvailable } from "./adb.js";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
const pkg = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "package.json"), "utf-8"),
);

program
  .name("droneroute")
  .description(
    "Upload DJI waypoint mission KMZ files to RC controllers via USB",
  )
  .version(pkg.version)
  .argument("<file>", "path to a .kmz mission file")
  .action(async (file: string) => {
    // ── Validate the file ───────────────────────────────────────────
    const kmzPath = path.resolve(file);

    if (!fs.existsSync(kmzPath)) {
      console.error(chalk.red(`Error: file "${file}" not found`));
      process.exit(1);
    }

    if (!file.toLowerCase().endsWith(".kmz")) {
      const ext = path.extname(file) || "(none)";
      console.error(chalk.red(`Error: expected a .kmz file, got "${ext}"`));
      process.exit(1);
    }

    // ── Detect controllers ──────────────────────────────────────────
    console.log(chalk.dim("Searching for DJI controllers..."));

    const devices = detectDevices();

    if (devices.length === 0) {
      const hasAdb = isAdbAvailable();

      console.error(chalk.red("\nNo DJI controllers found.\n"));
      console.error(chalk.dim("Troubleshooting:"));
      console.error(
        chalk.dim("  • Connect the controller via USB and power it on"),
      );

      if (!hasAdb) {
        console.error(chalk.dim("  • Install adb for USB detection:"));
        console.error(
          chalk.dim("      macOS:   brew install android-platform-tools"),
        );
        console.error(chalk.dim("      Linux:   apt install adb"));
        console.error(
          chalk.dim("      Windows: included with Android SDK platform-tools"),
        );
      } else {
        console.error(chalk.dim("  • Enable USB debugging on the controller"));
        console.error(
          chalk.dim("  • Check that the USB cable supports data transfer"),
        );
      }

      console.error(
        chalk.dim("  • Or insert the controller's SD card directly"),
      );
      process.exit(1);
    }

    // ── Select device ───────────────────────────────────────────────
    const device = await selectDevice(devices);

    console.log(chalk.dim(`\nUsing ${device.label}`));

    // ── Upload ──────────────────────────────────────────────────────
    try {
      console.log(chalk.dim(`Uploading ${path.basename(kmzPath)}...`));

      const result = uploadKmz(device, kmzPath);

      console.log(chalk.green("\n✓ Mission uploaded successfully"));
      console.log(chalk.dim(`  Mission ID: ${result.uuid}`));
      console.log(
        chalk.dim("\nOpen DJI Fly on the controller and look for the new"),
      );
      console.log(chalk.dim("mission in the waypoint list."));
    } catch (err: any) {
      console.error(chalk.red(`\nUpload failed: ${err.message}`));
      console.error(
        chalk.dim("Check that the controller is connected and try again."),
      );
      process.exit(1);
    }
  });

program.parse();
