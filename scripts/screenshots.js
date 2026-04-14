const { chromium } = require('playwright');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://droneroute.localhost';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Rural coordinates for realistic drone screenshots (near Cingle Blanc)
const TARGET_LAT = 41.257517;
const TARGET_LNG = 0.930963;
const TARGET_ZOOM = 15;

// Pan the Leaflet map to the target coordinates
async function panToTarget(page) {
  // Wait until the ExposeMapInstance React effect has fired
  await page.waitForFunction(() => {
    const c = document.querySelector('.leaflet-container');
    return c && c._leaflet_map;
  }, { timeout: 10000 });

  await page.evaluate(([lat, lng, zoom]) => {
    const container = document.querySelector('.leaflet-container');
    const map = container._leaflet_map;
    map.setView([lat, lng], zoom, { animate: false });
  }, [TARGET_LAT, TARGET_LNG, TARGET_ZOOM]);
  await sleep(2000); // Wait for tiles to load
}

// Zoom the Leaflet map in by the given number of levels using the scroll wheel
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
    deviceScaleFactor: 1,
  });

  // Dismiss welcome dialog on every page
  await context.addInitScript(() => {
    localStorage.setItem('droneroute_welcome_dismissed', '1');
  });

  // ─── MAIN MAP (README hero shot) ─────────────────
  console.log('0/8 Main map...');
  {
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.leaflet-container');
    await sleep(2000);
    await panToTarget(page);

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Add several waypoints for a nice flight path
    await page.keyboard.press('w');
    await sleep(300);
    const mainWps = [
      [cx - 180, cy - 60],
      [cx - 80,  cy - 120],
      [cx + 40,  cy - 40],
      [cx + 140, cy - 100],
      [cx + 200, cy + 20],
      [cx + 80,  cy + 80],
    ];
    for (const [x, y] of mainWps) {
      await page.mouse.click(x, y);
      await sleep(400);
    }
    await page.keyboard.press('Escape');
    await sleep(1000);

    await page.screenshot({ path: path.join(OUT, 'main-map.jpg'), type: 'jpeg', quality: 90 });
    console.log('  -> saved main-map.jpg');
    await page.close();
  }

  // ─── ORBIT TEMPLATE ──────────────────────────────
  console.log('1/8 Orbit template...');
  {
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.leaflet-container');
    await sleep(2000);
    await panToTarget(page);

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Press O, drag from center outward — large radius for a visible circle
    await zoomIn(page, map, 2);
    await page.keyboard.press('o');
    await sleep(300);
    await page.mouse.move(cx - 40, cy - 80);
    await page.mouse.down();
    for (let i = 0; i <= 40; i++) {
      await page.mouse.move(cx - 40 + i * 6, cy - 80, { steps: 1 });
      await sleep(15);
    }
    await page.mouse.up();
    await sleep(1500);

    // Config panel should be visible with preview — crop to map area only
    await page.screenshot({
      path: path.join(OUT, 'template-orbit.jpg'), type: 'jpeg', quality: 85,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    console.log('  -> saved template-orbit.jpg');

    // Apply so we can reuse the pattern
    const applyBtn = page.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await applyBtn.click();
      await sleep(1000);
    }
    await page.close();
  }

  // ─── GRID SURVEY TEMPLATE ────────────────────────
  console.log('2/8 Grid survey template...');
  {
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.leaflet-container');
    await sleep(2000);
    await panToTarget(page);

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await zoomIn(page, map, 2);
    await page.keyboard.press('g');
    await sleep(300);
    await page.mouse.move(cx - 180, cy - 140);
    await page.mouse.down();
    for (let i = 0; i <= 40; i++) {
      await page.mouse.move(cx - 180 + i * 9, cy - 140 + i * 7, { steps: 1 });
      await sleep(15);
    }
    await page.mouse.up();
    await sleep(1500);

    await page.screenshot({
      path: path.join(OUT, 'template-grid.jpg'), type: 'jpeg', quality: 85,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    console.log('  -> saved template-grid.jpg');
    await page.close();
  }

  // ─── FACADE SCAN TEMPLATE ────────────────────────
  console.log('3/8 Facade scan template...');
  {
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.leaflet-container');
    await sleep(2000);
    await panToTarget(page);

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await zoomIn(page, map, 2);
    await page.keyboard.press('f');
    await sleep(300);
    await page.mouse.move(cx - 200, cy - 60);
    await page.mouse.down();
    for (let i = 0; i <= 40; i++) {
      await page.mouse.move(cx - 200 + i * 10, cy - 60 + i * 1, { steps: 1 });
      await sleep(15);
    }
    await page.mouse.up();
    await sleep(1500);

    await page.screenshot({
      path: path.join(OUT, 'template-facade.jpg'), type: 'jpeg', quality: 85,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    console.log('  -> saved template-facade.jpg');
    await page.close();
  }

  // ─── PENCIL PATH TEMPLATE ─────────────────────────
  console.log('4/8 Pencil path template...');
  {
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.leaflet-container');
    await sleep(2000);
    await panToTarget(page);

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await zoomIn(page, map, 2);
    await page.keyboard.press('z');
    await sleep(300);

    // Draw a freehand S-curve across the map — wide sweep
    await page.mouse.move(cx - 250, cy - 80);
    await page.mouse.down();
    const curvePoints = [];
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const x = cx - 250 + t * 500;
      const y = cy - 80 + Math.sin(t * Math.PI * 2) * 120;
      curvePoints.push([x, y]);
    }
    for (const [x, y] of curvePoints) {
      await page.mouse.move(x, y, { steps: 1 });
      await sleep(10);
    }
    await page.mouse.up();
    await sleep(1500);

    // Config panel should be visible with preview — crop to map area only
    await page.screenshot({
      path: path.join(OUT, 'template-pencil.jpg'), type: 'jpeg', quality: 85,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
    console.log('  -> saved template-pencil.jpg');
    await page.close();
  }

  // ─── MISSION WITH WAYPOINTS + POI (for multiselect + elevation) ───
  console.log('5/8 Building mission with waypoints + POI...');
  {
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.leaflet-container');
    await sleep(2000);
    await panToTarget(page);

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Add a POI first
    await page.keyboard.press('p');
    await sleep(300);
    await page.mouse.click(cx + 20, cy - 10);
    await sleep(500);
    await page.keyboard.press('Escape');
    await sleep(300);

    // Add waypoints around the POI
    await page.keyboard.press('w');
    await sleep(300);
    const wpPos = [
      [cx - 160, cy - 90],
      [cx - 60,  cy - 130],
      [cx + 60,  cy - 70],
      [cx + 140, cy - 110],
      [cx + 200, cy - 30],
      [cx + 120, cy + 60],
      [cx + 10,  cy + 90],
      [cx - 110, cy + 50],
    ];
    for (const [x, y] of wpPos) {
      await page.mouse.click(x, y);
      await sleep(400);
    }
    await page.keyboard.press('Escape');
    await sleep(500);

    // ─── MULTISELECT SCREENSHOT ───
    console.log('6/8 Multiselect...');
    // Click waypoints in the sidebar list with Cmd held to multiselect
    const wpItems = page.locator('[class*="flex items-center gap-2 rounded-md px-2"]');
    const count = await wpItems.count();
    if (count >= 6) {
      await wpItems.nth(0).click();
      await sleep(200);
      await wpItems.nth(2).click({ modifiers: ['Meta'] });
      await sleep(200);
      await wpItems.nth(4).click({ modifiers: ['Meta'] });
      await sleep(200);
      await wpItems.nth(6).click({ modifiers: ['Meta'] });
      await sleep(500);
    }

    await page.screenshot({ path: path.join(OUT, 'multiselect.jpg'), type: 'jpeg', quality: 85 });
    console.log('  -> saved multiselect.jpg');

    // ─── ELEVATION GRAPH SCREENSHOT ───
    console.log('7/8 Elevation graph...');
    await page.keyboard.press('Escape');
    await sleep(300);

    // Elevation graph is a canvas or SVG in the sidebar, above the footer stats
    // Take a cropped screenshot of the sidebar bottom area
    const sidebar = page.locator('[class*="w-88"]').first();
    if (await sidebar.isVisible()) {
      const sidebarBox = await sidebar.boundingBox();
      // The elevation graph + stats are at the bottom of the sidebar
      // Crop bottom portion of the sidebar
      const clipHeight = 200;
      await page.screenshot({
        path: path.join(OUT, 'elevation-graph.jpg'), type: 'jpeg', quality: 85,
        clip: {
          x: sidebarBox.x,
          y: sidebarBox.y + sidebarBox.height - clipHeight,
          width: sidebarBox.width,
          height: clipHeight,
        },
      });
      console.log('  -> saved elevation-graph.jpg');
    }

    await page.close();
  }

  // ─── GIMBAL PITCH (orbit template with all-green POI lines) ───
  console.log('8/8 Gimbal pitch (orbit)...');
  {
    const page = await context.newPage();
    await page.goto(BASE);
    await page.waitForSelector('.leaflet-container');
    await sleep(2000);
    await panToTarget(page);

    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Zoom in for a clear orbit view
    await zoomIn(page, map, 2);

    // Create orbit via template (press O, drag from center outward)
    await page.keyboard.press('o');
    await sleep(500);
    await page.mouse.move(cx - 40, cy - 60);
    await page.mouse.down();
    const dragRadius = 180;
    for (let i = 0; i <= 40; i++) {
      await page.mouse.move(cx - 40 + i * (dragRadius / 40), cy - 60, { steps: 1 });
      await sleep(15);
    }
    await page.mouse.up();
    await sleep(1500);

    // Apply the orbit template — the store auto-converts orbit waypoints to
    // headingMode "towardPOI" linked to the orbit center POI, and the
    // pre-calculated gimbal pitch matches calculateIdealGimbalPitch, so all
    // POI-pointing lines are green.
    const applyBtn = page.getByRole('button', { name: /apply/i });
    if (await applyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await applyBtn.click();
      await sleep(1500);
    }

    // Select the first waypoint to show the editor sidebar
    await page.keyboard.press('Escape');
    await sleep(300);
    const wp1 = page.locator('text=Waypoint 1').first();
    if (await wp1.isVisible({ timeout: 2000 }).catch(() => false)) {
      await wp1.click();
      await sleep(800);
    }

    await page.screenshot({ path: path.join(OUT, 'gimbal-pitch.jpg'), type: 'jpeg', quality: 85 });
    console.log('  -> saved gimbal-pitch.jpg');
    await page.close();
  }

  await browser.close();
  console.log('\nAll screenshots captured!');
  console.log('Output directory:', OUT);
})().catch(err => {
  console.error('Screenshot script failed:', err);
  process.exit(1);
});
