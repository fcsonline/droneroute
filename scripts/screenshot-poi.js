const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:5173';
const OUT = path.join(__dirname, '..', 'docs', 'screenshots');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setWaypointTowardPOI(page, wpName) {
  // Click waypoint in sidebar
  await page.locator(`text=${wpName}`).first().click();
  await sleep(400);

  // Find and click the Heading Mode trigger (the one showing "Use Global" or "followWayline")
  const headingTrigger = page.locator('button[role="combobox"]').filter({ hasText: /Global.*follow|followWayline/i }).first();
  if (await headingTrigger.isVisible({ timeout: 1000 }).catch(() => false)) {
    await headingTrigger.click();
    await sleep(200);
    await page.getByRole('option', { name: /Toward POI/i }).click();
    await sleep(300);
  }

  // Now select the Target POI (dropdown showing "None")
  const poiTrigger = page.locator('button[role="combobox"]').filter({ hasText: /None/i }).first();
  if (await poiTrigger.isVisible({ timeout: 1000 }).catch(() => false)) {
    await poiTrigger.click();
    await sleep(200);
    // Select "POI 1" (the first/only POI)
    const poiOption = page.getByRole('option', { name: /POI 1/i });
    if (await poiOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await poiOption.click();
      await sleep(300);
    } else {
      console.log(`  No POI option found for ${wpName}`);
    }
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
    localStorage.setItem('droneroute_welcome_dismissed', '1');
  });

  const page = await context.newPage();
  await page.goto(BASE);
  await page.waitForSelector('.leaflet-container');
  await sleep(2000);

  const map = page.locator('.leaflet-container');
  const box = await map.boundingBox();

  // Place a POI (press P, click on map) — right-center area
  await page.keyboard.press('p');
  await sleep(300);
  await page.mouse.click(box.x + box.width * 0.62, box.y + box.height * 0.42);
  await sleep(500);
  await page.keyboard.press('Escape');
  await sleep(300);

  // Place 3 waypoints around the POI
  await page.keyboard.press('w');
  await sleep(300);
  await page.mouse.click(box.x + box.width * 0.38, box.y + box.height * 0.30);
  await sleep(400);
  await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.58);
  await sleep(400);
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.32);
  await sleep(400);
  await page.keyboard.press('Escape');
  await sleep(500);

  // Set all 3 waypoints to "Toward POI" → "POI 1"
  console.log('Setting Waypoint 1...');
  await setWaypointTowardPOI(page, 'Waypoint 1');
  console.log('Setting Waypoint 2...');
  await setWaypointTowardPOI(page, 'Waypoint 2');
  console.log('Setting Waypoint 3...');
  await setWaypointTowardPOI(page, 'Waypoint 3');

  // Now go back to Waypoint 1 and click the "Perfect pitch" button to apply it
  console.log('Applying perfect pitch to Waypoint 1...');
  await page.locator('text=Waypoint 1').first().click();
  await sleep(400);
  const perfectPitch = page.locator('button').filter({ hasText: /Perfect pitch/i }).first();
  if (await perfectPitch.isVisible({ timeout: 2000 }).catch(() => false)) {
    await perfectPitch.click();
    await sleep(300);
    console.log('  Perfect pitch applied to WP1');
  } else {
    console.log('  Perfect pitch button not found for WP1');
  }

  // Apply perfect pitch to WP3 too (so it's green), leave WP2 as red
  console.log('Applying perfect pitch to Waypoint 3...');
  await page.locator('text=Waypoint 3').first().click();
  await sleep(400);
  const perfectPitch3 = page.locator('button').filter({ hasText: /Perfect pitch/i }).first();
  if (await perfectPitch3.isVisible({ timeout: 2000 }).catch(() => false)) {
    await perfectPitch3.click();
    await sleep(300);
    console.log('  Perfect pitch applied to WP3');
  } else {
    console.log('  Perfect pitch button not found for WP3');
  }

  // Go back to Waypoint 1 so we can see the perfect pitch button in the sidebar
  await page.locator('text=Waypoint 1').first().click();
  await sleep(500);

  // Take the final screenshot
  await page.screenshot({ path: path.join(OUT, 'gimbal-pitch.jpg'), type: 'jpeg', quality: 90 });
  console.log('Screenshot saved: gimbal-pitch.jpg');

  await browser.close();
})();
