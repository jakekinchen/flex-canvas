#!/usr/bin/env node
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const options = parseArgs(process.argv.slice(2));
const baseUrl = stripTrailingSlash(options.get("base-url") ?? process.env.FLEX_CANVAS_BASE_URL ?? "http://localhost:3000");
const threshold = Number(options.get("threshold") ?? process.env.FLEX_CANVAS_VISUAL_THRESHOLD ?? 85);
const reportPath = path.resolve(
  rootDir,
  options.get("report") ?? process.env.FLEX_CANVAS_VISUAL_REPORT ?? "test-results/reference-ui-similarity.json",
);
const artifactPrefix = sanitizeArtifactPrefix(
  options.get("artifact-prefix") ?? path.basename(reportPath, path.extname(reportPath)),
);
const outputDir = path.resolve(rootDir, "output/playwright");
const referencePath = path.resolve(rootDir, "image-flex-canvas.png");
const browserExecutable = findChrome();

const cases = [
  {
    actualCopy: "actual-crop-desktop.png",
    cropSelector: ".reference-shell",
    name: "desktop app crop",
    referenceCopy: "reference-crop-desktop-app.png",
    screenshot: "reference-visual-desktop.png",
    viewport: { width: 1080, height: 1024 },
    mobile: false,
    reference: { path: referencePath, crop: { left: 28, top: 42, width: 1024, height: 940 } },
  },
  {
    actualCopy: "actual-crop-mobile.png",
    name: "mobile phone crop",
    referenceCopy: "reference-crop-mobile.png",
    screenshot: "reference-visual-mobile.png",
    viewport: { width: 408, height: 930 },
    mobile: true,
    reference: { path: referencePath, crop: { left: 1094, top: 42, width: 396, height: 915 } },
  },
  {
    actualCopy: "actual-crop-mobile-390.png",
    name: "mobile 390 compact crop",
    referenceCopy: "reference-crop-mobile-390.png",
    screenshot: "reference-visual-mobile-390.png",
    viewport: { width: 390, height: 844 },
    mobile: true,
    reference: {
      path: referencePath,
      crop: { left: 1096, top: 18, width: 392, height: 895 },
    },
  },
];

mkdirSync(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(browserExecutable ? { executablePath: browserExecutable } : {}),
});

const results = [];
try {
  for (const testCase of cases) {
    const screenshotPath = path.join(outputDir, `${artifactPrefix}-${testCase.screenshot}`);
    const actualCopyPath = path.join(outputDir, `${artifactPrefix}-${testCase.actualCopy}`);
    const referenceCopyPath = path.join(outputDir, `${artifactPrefix}-${testCase.referenceCopy}`);
    const context = await browser.newContext({
      deviceScaleFactor: 1,
      hasTouch: testCase.mobile,
      isMobile: testCase.mobile,
      viewport: testCase.viewport,
    });
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.waitForSelector(".reference-shell", { timeout: 30000 });
    const cropBox = testCase.cropSelector ? await boxForSelector(page, testCase.cropSelector) : null;
    await page.screenshot({ fullPage: false, path: screenshotPath });
    await context.close();

    await writeActualCopy(screenshotPath, actualCopyPath, cropBox);
    await writeReferenceCopy(testCase, actualCopyPath, referenceCopyPath);
    const similarity = await compareScreenshot(referenceCopyPath, actualCopyPath);
    const passed = similarity >= threshold;
    results.push({
      name: testCase.name,
      actualCopy: path.relative(rootDir, actualCopyPath),
      passed,
      referenceCopy: path.relative(rootDir, referenceCopyPath),
      screenshot: path.relative(rootDir, screenshotPath),
      similarity,
      threshold,
      viewport: testCase.viewport,
    });
    console.log(`${passed ? "PASS" : "FAIL"} ${testCase.name}: ${similarity.toFixed(4)}%`);
  }
} finally {
  await browser.close();
}

const passed = results.every((result) => result.passed);
mkdirSync(path.dirname(reportPath), { recursive: true });
writeFileSync(
  reportPath,
  `${JSON.stringify(
    {
      baseUrl,
      passed,
      reference: path.relative(rootDir, referencePath),
      results,
      threshold,
    },
    null,
    2,
  )}\n`,
);
console.log(`Report: ${reportPath}`);
if (!passed) process.exitCode = 1;

async function boxForSelector(page, selector) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`Could not locate ${selector}`);
  return {
    height: Math.round(box.height),
    left: Math.round(box.x),
    top: Math.round(box.y),
    width: Math.round(box.width),
  };
}

async function writeActualCopy(screenshotPath, actualCopyPath, cropBox) {
  let actual = sharp(screenshotPath);
  if (cropBox) actual = actual.extract(cropBox);
  await actual.png().toFile(actualCopyPath);
}

async function writeReferenceCopy(testCase, actualCopyPath, referenceCopyPath) {
  const actualMeta = await sharp(actualCopyPath).metadata();
  const actualWidth = requiredNumber(actualMeta.width, "actual width");
  const actualHeight = requiredNumber(actualMeta.height, "actual height");
  let reference = sharp(testCase.reference.path);
  if (testCase.reference.crop) reference = reference.extract(testCase.reference.crop);
  if (testCase.reference.scaleToWidthThenCrop) {
    const sourceHeight = testCase.reference.crop?.height ?? requiredNumber((await sharp(testCase.reference.path).metadata()).height, "reference height");
    const sourceWidth = testCase.reference.crop?.width ?? requiredNumber((await sharp(testCase.reference.path).metadata()).width, "reference width");
    const scaledHeight = Math.round((sourceHeight * actualWidth) / sourceWidth);
    reference = reference.resize(actualWidth, scaledHeight, { fit: "fill" }).extract({
      height: actualHeight,
      left: 0,
      top: 0,
      width: actualWidth,
    });
  } else {
    reference = reference.resize(actualWidth, actualHeight, { fit: "fill" });
  }
  await reference.png().toFile(referenceCopyPath);
}

async function compareScreenshot(referenceCopyPath, screenshotPath) {
  const [referencePixels, screenshotPixels] = await Promise.all([
    sharp(referenceCopyPath).removeAlpha().raw().toBuffer(),
    sharp(screenshotPath).removeAlpha().raw().toBuffer(),
  ]);
  let sum = 0;
  for (let index = 0; index < referencePixels.length; index += 1) {
    sum += Math.abs(referencePixels[index] - screenshotPixels[index]);
  }
  const mae = sum / referencePixels.length;
  return 100 * (1 - mae / 255);
}

function requiredNumber(value, label) {
  if (typeof value !== "number") throw new Error(`Missing ${label}`);
  return value;
}

function parseArgs(args) {
  const parsed = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;
    const [key, inlineValue] = arg.slice(2).split("=");
    if (inlineValue !== undefined) {
      parsed.set(key, inlineValue);
    } else if (args[index + 1] && !args[index + 1].startsWith("--")) {
      parsed.set(key, args[index + 1]);
      index += 1;
    } else {
      parsed.set(key, "true");
    }
  }
  return parsed;
}

function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? "";
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function sanitizeArtifactPrefix(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "reference-ui";
}
