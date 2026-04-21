const { chromium } = require("playwright");
const path = require("path");

const BASE = process.env.BASE_URL || "http://droneroute.localhost";
const OUT = path.join(__dirname, "..", "docs", "screenshots");

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Same target coordinates used by screenshots.js
const TARGET_LAT = 41.257517;
const TARGET_LNG = 0.930963;
const TARGET_ZOOM = 15;

async function panToTarget(page) {
  await page.waitForFunction(
    () => {
      const c = document.querySelector(".leaflet-container");
      return c && c._leaflet_map;
    },
    { timeout: 10000 },
  );

  await page.evaluate(
    ([lat, lng, zoom]) => {
      const container = document.querySelector(".leaflet-container");
      const map = container._leaflet_map;
      map.setView([lat, lng], zoom, { animate: false });
    },
    [TARGET_LAT, TARGET_LNG, TARGET_ZOOM],
  );
  await sleep(2000);
}

async function zoomIn(page, map, levels = 3) {
  const box = await map.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  for (let i = 0; i < levels; i++) {
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -300);
    await sleep(600);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    deviceScaleFactor: 2,
  });

  // Dismiss welcome dialog
  await context.addInitScript(() => {
    localStorage.setItem("droneroute_welcome_dismissed", "1");
  });

  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForSelector(".leaflet-container");
  await sleep(2000);
  await panToTarget(page);

  const map = page.locator(".leaflet-container");
  const box = await map.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Zoom in for a nice orbit view
  await zoomIn(page, map, 2);

  // Create orbit via template (press O, drag from center outward)
  await page.keyboard.press("o");
  await sleep(500);
  await page.mouse.move(cx - 40, cy - 60);
  await page.mouse.down();
  const dragRadius = 180;
  for (let i = 0; i <= 40; i++) {
    await page.mouse.move(cx - 40 + i * (dragRadius / 40), cy - 60, {
      steps: 1,
    });
    await sleep(15);
  }
  await page.mouse.up();
  await sleep(1500);

  // Apply the orbit template
  const applyBtn = page.getByRole("button", { name: /apply/i });
  if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await applyBtn.click();
    await sleep(1500);
  }
  console.log("Orbit template applied");

  // The store auto-converts orbit waypoints to headingMode "towardPOI" with
  // the orbit center POI linked, and the gimbal pitch is pre-calculated to
  // match calculateIdealGimbalPitch — so all POI lines should be green.

  // Select the first waypoint to show the editor sidebar with the
  // "Perfect pitch" badge visible
  await page.keyboard.press("Escape");
  await sleep(300);
  const wpItems = page.locator("text=Waypoint 1").first();
  if (await wpItems.isVisible({ timeout: 2000 }).catch(() => false)) {
    await wpItems.click();
    await sleep(800);
  }

  // Take the final screenshot
  await page.screenshot({
    path: path.join(OUT, "gimbal-pitch.jpg"),
    type: "jpeg",
    quality: 90,
  });
  console.log("Screenshot saved: gimbal-pitch.jpg");

  await browser.close();
})().catch((err) => {
  console.error("Screenshot script failed:", err);
  process.exit(1);
});
