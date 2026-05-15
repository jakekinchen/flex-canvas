#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Liveblocks, LiveMap, LiveObject } from "@liveblocks/node";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnvFile(path.join(rootDir, ".env.local"));

const options = parseArgs(process.argv.slice(2));
const runId = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const baseUrl = stripTrailingSlash(valueFor("base-url", "COLLABBOARD_BASE_URL", "http://localhost:3000"));
const userCount = numberFor("users", "COLLABBOARD_USERS", 5);
const capacityObjects = numberFor("capacity-objects", "COLLABBOARD_CAPACITY_OBJECTS", 500);
const aiLatencyTargetMs = numberFor("ai-latency-ms", "COLLABBOARD_AI_LATENCY_TARGET_MS", 2000);
const objectSyncTargetMs = numberFor("object-sync-ms", "COLLABBOARD_OBJECT_SYNC_TARGET_MS", 100);
const cursorSyncTargetMs = numberFor("cursor-sync-ms", "COLLABBOARD_CURSOR_SYNC_TARGET_MS", 50);
const fpsTarget = numberFor("fps", "COLLABBOARD_FPS_TARGET", 60);
const skipCapacity = booleanFor("skip-capacity", "COLLABBOARD_SKIP_CAPACITY", false);
const skipMobile = booleanFor("skip-mobile", "COLLABBOARD_SKIP_MOBILE", false);
const skipReconnect = booleanFor("skip-reconnect", "COLLABBOARD_SKIP_RECONNECT", false);
const skipOpenAi = booleanFor("skip-openai", "COLLABBOARD_SKIP_OPENAI", false);
const cleanupUsers = booleanFor("cleanup-users", "COLLABBOARD_CLEANUP_USERS", false);
const headed = booleanFor("headed", "COLLABBOARD_HEADED", false);
const browserExecutable = valueFor("browser-executable", "COLLABBOARD_BROWSER_EXECUTABLE", findChrome());
const reportPath = path.resolve(
  rootDir,
  valueFor("report", "COLLABBOARD_REPORT", `test-results/collabboard-smoke-${runId}.json`),
);
const canvasSelector = ".board-canvas-stage canvas";
const objectSelector = ".board-object-probe";

const results = {
  runId,
  baseUrl,
  targets: {
    users: userCount,
    aiLatencyTargetMs,
    objectSyncTargetMs,
    cursorSyncTargetMs,
    fpsTarget,
    capacityObjects: skipCapacity ? 0 : capacityObjects,
    mobileViewport: skipMobile ? null : { width: 390, height: 844 },
  },
  checks: [],
};

let browser;
let adminClient;
let smokeUsers = [];

try {
  adminClient = createAdminClient();
  smokeUsers = adminClient ? await createSmokeUsers(userCount) : createAnonymousUsers(userCount);
  browser = await chromium.launch({
    headless: !headed,
    ...(browserExecutable ? { executablePath: browserExecutable } : {}),
  });

  const pages = [];
  const readyLatencies = [];
  const owner = await newSmokePage(browser, smokeUsers[0]);
  pages.push(owner);

  const boardName = `Flex Canvas smoke ${runId}`;
  const createStartedAt = Date.now();
  const boardUrl = await createBoard(owner.page, boardName);
  const boardId = boardUrl.split("/boards/")[1]?.split(/[?#]/)[0];
  if (!boardId) throw new Error(`Could not derive board id from ${boardUrl}`);
  await waitForBoardReady(owner.page, smokeUsers[0].name);
  readyLatencies.push(Date.now() - createStartedAt);
  pass("owner board ready", { boardUrl, latencyMs: readyLatencies[0] });

  for (let index = 1; index < userCount; index += 1) {
    const joined = await newSmokePage(browser, smokeUsers[index]);
    pages.push(joined);
    const startedAt = Date.now();
    await joined.page.goto(boardUrl, { waitUntil: "domcontentloaded" });
    await waitForBoardReady(joined.page, smokeUsers[index].name);
    readyLatencies.push(Date.now() - startedAt);
  }
  pass("5+ browser users joined", { requestedUsers: userCount, readyLatenciesMs: readyLatencies });

  const presenceStartedAt = Date.now();
  await owner.page.waitForFunction((count) => document.querySelectorAll(".presence-pill").length >= count, userCount, {
    timeout: 15000,
  });
  pass("presence list reached user target", {
    latencyMs: Date.now() - presenceStartedAt,
    visiblePeople: await owner.page.locator(".presence-pill").count(),
  });

  const duplicateOwner = await newSmokePage(browser, smokeUsers[0]);
  pages.push(duplicateOwner);
  const duplicateStartedAt = Date.now();
  await duplicateOwner.page.goto(boardUrl, { waitUntil: "domcontentloaded" });
  await waitForBoardReady(duplicateOwner.page, smokeUsers[0].name);
  const duplicateNameProbe = await measureDuplicateUserLabels(owner.page, duplicateOwner.page, smokeUsers[0].name);
  check("duplicate same-user tabs are numbered", duplicateNameProbe.ok, {
    ...duplicateNameProbe,
    latencyMs: Date.now() - duplicateStartedAt,
  });

  const cursorLatencyMs = await measureCursorLatency(owner.page, pages[1].page, smokeUsers[0].name);
  check("cursor propagation observed", cursorLatencyMs !== null, {
    latencyMs: cursorLatencyMs,
    targetMs: cursorSyncTargetMs,
  });
  if (cursorLatencyMs !== null) {
    check("cursor latency target", cursorLatencyMs <= cursorSyncTargetMs, {
      latencyMs: cursorLatencyMs,
      targetMs: cursorSyncTargetMs,
    });
  }
  const cursorTrackingProbe = await measureCursorTracking(owner.page, pages[1].page, smokeUsers[0].name);
  check("cursor screen position tracks source canvas point", cursorTrackingProbe.aligned, cursorTrackingProbe);

  const humanStickyProbe = await createToolbarSticky(owner.page, pages[1].page);
  check("human-created sticky note synced", humanStickyProbe.synced, humanStickyProbe);

  const editProbe = await editStickyText(owner.page, pages[1].page, humanStickyProbe.objectId, "Edited by owner");
  check("human sticky text edit synced", editProbe.synced, editProbe);

  const moveProbe = await moveObjectWithMouse(pages[1].page, owner.page, humanStickyProbe.objectId, 90, 48);
  check("human object move synced", moveProbe.synced, moveProbe);

  const colorProbe = await changeSelectedObjectColor(owner.page, pages[1].page, humanStickyProbe.objectId, "green", "#86efac");
  check("human color change synced", colorProbe.synced, colorProbe);

  const conflictProbe = await simultaneousTextEditConflict(owner.page, pages[1].page, humanStickyProbe.objectId);
  check("simultaneous text edit converged", conflictProbe.converged, conflictProbe);

  const duplicateProbe = await duplicateSelectedObject(owner.page, pages[1].page, humanStickyProbe.objectId);
  check("duplicate selection synced", duplicateProbe.synced, duplicateProbe);

  const copyPasteProbe = await copyPasteSelectedObject(owner.page, pages[1].page);
  check("copy/paste selection synced", copyPasteProbe.synced, copyPasteProbe);

  const rectangleProbe = await createToolbarObject(owner.page, pages[1].page, "Rectangle");
  check("human-created rectangle synced", rectangleProbe.synced, rectangleProbe);

  const transformProbe = await resizeRotateObjectWithTransformer(owner.page, pages[1].page, rectangleProbe.objectId);
  check("resize and rotate transform synced", transformProbe.resized && transformProbe.rotated, transformProbe);

  const lineProbe = await createToolbarObject(owner.page, pages[1].page, "Line");
  check("human-created line synced", lineProbe.synced, lineProbe);

  const connectorProbe = await createToolbarObject(owner.page, pages[1].page, "Arrow connector");
  check("human-created connector synced", connectorProbe.synced, connectorProbe);

  const frameProbe = await createToolbarFrame(owner.page, pages[1].page);
  check("human-created frame synced", frameProbe.synced, frameProbe);

  const frameEditProbe = await editStickyText(owner.page, pages[1].page, frameProbe.objectId, "Edited smoke frame");
  check("human frame title edit synced", frameEditProbe.synced, frameEditProbe);

  const dragSelectProbe = await dragSelectObjects(owner.page, 2);
  check("drag-to-select selected multiple objects", dragSelectProbe.selectedCount >= 2, dragSelectProbe);

  if (!skipOpenAi) {
    const demoAiProbe = await runAiCommandExpectShape(
      owner.page,
      pages[1].page,
      "Add a yellow sticky note that says User Research",
    );
    check("suggested prompt AI command created a synced shape", demoAiProbe.synced && demoAiProbe.mode === "openai", {
      ...demoAiProbe,
      expectedMode: "openai",
    });

    const simultaneousAiProbe = await simultaneousAiCommands(owner.page, pages[1].page);
    check(
      "simultaneous OpenAI commands synced",
      simultaneousAiProbe.synced &&
        simultaneousAiProbe.first.mode === "openai" &&
        simultaneousAiProbe.second.mode === "openai",
      simultaneousAiProbe,
    );

    const openAiProbe = await runAiCommandExpectShape(
      owner.page,
      pages[1].page,
      "Create a purple circle at position 360, 160",
    );
    check("OpenAI-backed AI command used live model and synced shape", openAiProbe.synced && openAiProbe.mode === "openai", {
      ...openAiProbe,
      expectedMode: "openai",
      targetEnforced: false,
    });
    const aiSourceBefore = await shapeCount(owner.page);
    const aiReceiverBefore = await shapeCount(pages[1].page);
    await installShapeObserver(owner.page, aiSourceBefore + 1);
    await installShapeObserver(pages[1].page, aiReceiverBefore + 1);
    const controlledAiRun = await runAiCommand(owner.page, "Create a SWOT analysis template", null, "openai");
    await pages[1].page.waitForFunction(
      (args) => document.querySelectorAll(args.selector).length > args.count,
      { selector: objectSelector, count: aiReceiverBefore },
      {
        timeout: 30000,
      },
    );
    const localShapeAt = await owner.page.evaluate(() => window.__collabSmokeShapeAt);
    const remoteShapeAt = await pages[1].page.evaluate(() => window.__collabSmokeShapeAt);
    const objectSyncLatencyMs =
      typeof localShapeAt === "number" && typeof remoteShapeAt === "number"
        ? Math.max(0, remoteShapeAt - localShapeAt)
        : null;
    check("OpenAI AI command completed", controlledAiRun.mode === "openai", {
      ...controlledAiRun,
      targetMs: aiLatencyTargetMs,
      targetEnforced: false,
    });
    const boardStateBefore = await shapeCount(owner.page);
    const boardStateProbe = await runAiCommand(
      owner.page,
      "Summarize the current board state without changing the board",
      null,
      "openai",
    );
    const boardStateAfter = await shapeCount(owner.page);
    check("board state command returned context without mutations", boardStateAfter === boardStateBefore, {
      ...boardStateProbe,
      before: boardStateBefore,
      after: boardStateAfter,
    });
    check("object sync latency measured", objectSyncLatencyMs !== null, {
      latencyMs: objectSyncLatencyMs,
      localShapeAt,
      remoteShapeAt,
    });
    if (objectSyncLatencyMs !== null) {
      check("object sync latency target", objectSyncLatencyMs <= objectSyncTargetMs, {
        latencyMs: objectSyncLatencyMs,
        targetMs: objectSyncTargetMs,
      });
    }
  } else {
    pass("OpenAI AI checks skipped", { skipOpenAi });
  }

  const refreshMinimum = await shapeCount(pages[1].page);
  await pages[1].page.reload({ waitUntil: "domcontentloaded" });
  await waitForBoardReady(pages[1].page, smokeUsers[1].name);
  await pages[1].page.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length >= args.target,
    { selector: objectSelector, target: refreshMinimum },
    {
      timeout: 15000,
    },
  );
  pass("refresh persistence", { shapeCount: await shapeCount(pages[1].page) });

  if (!skipMobile) {
    const mobileProbe = await runMobileLayoutProbe(browser, smokeUsers[0], boardUrl);
    check("mobile board layout target", mobileProbe.ok, mobileProbe);
  }

  if (!skipReconnect) {
    await reconnectRecovery(owner.page, pages[1].context, pages[1].page);
  }

  if (!skipCapacity) {
    const capacityRun = await seedCapacityObjects(boardId, capacityObjects, smokeUsers[0].id ?? smokeUsers[0].name);
    await waitForStoredShapeCount(boardId, capacityObjects, 60000);
    const storedShapes = await storedShapeCount(boardId);
    check("500+ object capacity in Liveblocks storage", storedShapes >= capacityObjects, {
      storedShapes,
      target: capacityObjects,
      seedLatencyMs: capacityRun.latencyMs,
    });
  }

  const fps = await measureInteractionFps(owner.page);
  check("pan/zoom frame-rate target", fps >= fpsTarget, { fps: round(fps), targetFps: fpsTarget });

  const failures = results.checks.filter((entry) => entry.status === "fail");
  writeReport();
  if (failures.length) {
    console.error(`Smoke failed: ${failures.map((entry) => entry.name).join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log(`Smoke passed. Report: ${reportPath}`);
  }
} catch (error) {
  fail("smoke runner crashed", { message: error instanceof Error ? error.message : String(error) });
  writeReport();
  console.error(error);
  process.exitCode = 1;
} finally {
  if (cleanupUsers && adminClient && smokeUsers.length) {
    await cleanupSmokeUsers(smokeUsers).catch((error) => console.warn(`Cleanup failed: ${error.message}`));
  }
  await browser?.close();
}

async function newSmokePage(activeBrowser, user, contextOptions = {}) {
  const context = await activeBrowser.newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions });
  const page = await context.newPage();
  page.on("pageerror", (error) => fail("browser page error", { user: user.name, message: error.message }));
  page.on("console", (message) => {
    if (message.type() === "error") {
      if (isExpectedOfflineConsoleError(message.text())) return;
      fail("browser console error", { user: user.name, message: message.text() });
    }
  });
  await login(page, user);
  return { context, page, user };
}

function isExpectedOfflineConsoleError(message) {
  return message.includes("wss://api.liveblocks.io") && message.includes("net::ERR_INTERNET_DISCONNECTED");
}

async function runMobileLayoutProbe(activeBrowser, user, boardUrl) {
  const mobile = await newSmokePage(activeBrowser, user, {
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });

  try {
    await mobile.page.goto(boardUrl, { waitUntil: "domcontentloaded" });
    await waitForBoardReady(mobile.page, user.name);
    await mobile.page.waitForLoadState("networkidle").catch(() => null);
    const metrics = await mobile.page.evaluate(() => {
      const rectFor = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          bottom: Math.round(rect.bottom),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
        };
      };
      const viewportWidth = window.innerWidth;
      const documentWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
      const toolbar = rectFor(".board-toolbar");
      const canvas = rectFor(".board-canvas-stage");
      const aiPanel = rectFor(".ai-panel");
      const topbar = rectFor(".board-topbar");
      const textarea = rectFor(".ai-panel textarea");
      const runButton = [...document.querySelectorAll("button")].find(
        (element) => element.textContent?.trim() === "Run command",
      );
      const runButtonRect = runButton?.getBoundingClientRect();

      return {
        aiPanel,
        canvas,
        horizontalOverflowPx: Math.max(0, documentWidth - viewportWidth),
        runButtonVisible: Boolean(runButtonRect && runButtonRect.width > 0 && runButtonRect.height > 0),
        textarea,
        textareaVisible: Boolean(textarea && textarea.width > 0 && textarea.height >= 80),
        toolbar,
        toolbarWithinViewport: Boolean(toolbar && toolbar.left >= -1 && toolbar.right <= viewportWidth + 1),
        topbar,
        viewportHeight: window.innerHeight,
        viewportWidth,
      };
    });

    return {
      ...metrics,
      ok:
        metrics.horizontalOverflowPx <= 1 &&
        Boolean(metrics.canvas && metrics.canvas.width >= 320 && metrics.canvas.height >= 340) &&
        Boolean(metrics.aiPanel && metrics.aiPanel.width <= metrics.viewportWidth + 1) &&
        metrics.toolbarWithinViewport &&
        metrics.runButtonVisible &&
        metrics.textareaVisible,
    };
  } finally {
    await mobile.context.close();
  }
}

async function login(page, user) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => null);
  if (!new URL(page.url()).pathname.startsWith("/login")) return;

  await page.getByPlaceholder("Your board label").fill(user.name);
  if (user.email) {
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill(user.password);
    await page.getByRole("button", { name: "Sign in" }).waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")].find((element) => element.textContent?.trim() === "Sign in");
      return button && !button.hasAttribute("disabled");
    });
    await page.getByRole("button", { name: "Sign in" }).click();
  } else {
    await page.getByRole("button", { name: "Continue as guest" }).click();
  }
  await waitForPath(page, /^\/boards$/, "login");
}

async function createBoard(page, boardName) {
  const visibleNameInput = page.getByPlaceholder("Board name");
  if (await visibleNameInput.isVisible().catch(() => false)) {
    await visibleNameInput.fill(boardName);
  } else {
    await page.locator('input[name="name"]').first().evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, boardName);
  }
  await page.getByRole("button", { name: /Create board|Start board/ }).first().click();
  await waitForPath(page, /^\/boards\/[0-9a-f-]+$/, "board create");
  return page.url();
}

async function waitForBoardReady(page, name) {
  await page.waitForSelector(canvasSelector, { timeout: 45000 });
  await page.getByRole("button", { name: "Run command" }).waitFor({ timeout: 45000 });
  const saveButton = page.getByRole("button", { name: "Save" });
  if (await saveButton.isVisible().catch(() => false)) {
    await page.getByLabel("Name").fill(name);
    await saveButton.click();
  }
}

async function waitForPath(page, pattern, label) {
  try {
    await page.waitForFunction((source) => new RegExp(source).test(location.pathname), pattern.source, {
      timeout: 45000,
    });
  } catch {
    const body = await page.locator("body").innerText().catch(() => "");
    throw new Error(`${label} timed out at ${page.url()}: ${body.slice(0, 500)}`);
  }
}

async function runAiCommand(page, command, expectedStatus, expectedMode) {
  await page.locator(".ai-panel textarea").fill(command);
  const startedAt = Date.now();
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/ai-command") && response.request().method() === "POST",
    { timeout: 70000 },
  );
  await page.getByRole("button", { name: "Run command" }).click();
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`AI command failed with ${response.status()}: ${(await response.text()).slice(0, 500)}`);
  }
  if (expectedStatus) {
    await page.getByText(expectedStatus).waitFor({ timeout: 60000 });
  }
  const latencyMs = Date.now() - startedAt;
  const status = page.locator(".form-status").last();
  if (expectedMode) {
    await page.locator(`.form-status[data-ai-mode="${expectedMode}"]`).last().waitFor({ timeout: 5000 });
  }
  return {
    command,
    latencyMs,
    mode: await status.getAttribute("data-ai-mode").catch(() => null),
    status: await status.innerText().catch(() => ""),
  };
}

async function createToolbarSticky(sourcePage, receiverPage) {
  const sourceBefore = await shapeCount(sourcePage);
  const receiverBefore = await shapeCount(receiverPage);
  await sourcePage.getByRole("button", { name: "Sticky note", exact: true }).click();
  await sourcePage.locator(".object-editor-overlay").fill("Human sticky");
  await sourcePage.keyboard.press("Enter");
  await waitForObjectText(sourcePage, "Human sticky", sourceBefore);
  const sourceObject = await objectByText(sourcePage, "Human sticky");
  await waitForObjectText(receiverPage, "Human sticky", receiverBefore);
  return {
    objectId: sourceObject?.id,
    sourceBefore,
    sourceAfter: await shapeCount(sourcePage),
    receiverBefore,
    receiverAfter: await shapeCount(receiverPage),
    synced: Boolean(sourceObject?.id) && (await shapeCount(receiverPage)) > receiverBefore,
  };
}

async function createToolbarStickyLocal(sourcePage, text) {
  const before = await shapeCount(sourcePage);
  await sourcePage.getByRole("button", { name: "Sticky note", exact: true }).click();
  await sourcePage.locator(".object-editor-overlay").fill(text);
  await sourcePage.keyboard.press("Enter");
  await waitForObjectText(sourcePage, text, before);
  return {
    before,
    after: await shapeCount(sourcePage),
  };
}

async function createToolbarObject(sourcePage, receiverPage, buttonName) {
  const sourceBefore = await shapeCount(sourcePage);
  const receiverBefore = await shapeCount(receiverPage);
  const beforeIds = await objectIds(sourcePage);
  await sourcePage.getByRole("button", { name: buttonName, exact: true }).click();
  await sourcePage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length > args.count,
    { selector: objectSelector, count: sourceBefore },
    { timeout: 10000 },
  );
  await receiverPage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length > args.count,
    { selector: objectSelector, count: receiverBefore },
    { timeout: 10000 },
  );
  const afterIds = await objectIds(sourcePage);
  const objectId = afterIds.find((id) => !beforeIds.includes(id));
  return {
    buttonName,
    objectId,
    sourceBefore,
    sourceAfter: await shapeCount(sourcePage),
    receiverBefore,
    receiverAfter: await shapeCount(receiverPage),
    synced: (await shapeCount(sourcePage)) > sourceBefore && (await shapeCount(receiverPage)) > receiverBefore,
  };
}

async function createToolbarFrame(sourcePage, receiverPage) {
  const sourceBefore = await shapeCount(sourcePage);
  const receiverBefore = await shapeCount(receiverPage);
  await sourcePage.getByRole("button", { name: "Frame", exact: true }).click();
  await sourcePage.locator(".object-editor-overlay").fill("Smoke frame");
  await sourcePage.keyboard.press("Enter");
  await waitForObjectText(sourcePage, "Smoke frame", sourceBefore);
  const sourceObject = await objectByText(sourcePage, "Smoke frame");
  await waitForObjectText(receiverPage, "Smoke frame", receiverBefore);
  return {
    objectId: sourceObject?.id,
    sourceBefore,
    sourceAfter: await shapeCount(sourcePage),
    receiverBefore,
    receiverAfter: await shapeCount(receiverPage),
    synced: Boolean(sourceObject?.id) && (await shapeCount(receiverPage)) > receiverBefore,
  };
}

async function selectObjectById(page, objectId) {
  const object = await objectById(page, objectId);
  const box = await page.locator(canvasSelector).boundingBox();
  if (!object || !box) return { objectId, selected: false, reason: "object or canvas missing" };
  await page.mouse.click(box.x + object.x + object.width / 2, box.y + object.y + object.height / 2);
  await page.waitForFunction(
    (args) => {
      const object = [...document.querySelectorAll(args.selector)].find(
        (element) => element.getAttribute("data-object-id") === args.objectId,
      );
      return object?.getAttribute("data-object-selected") === "true";
    },
    { selector: objectSelector, objectId },
    { timeout: 5000 },
  );
  return { objectId, selected: true };
}

async function changeSelectedObjectColor(sourcePage, receiverPage, objectId, colorName, expectedColor) {
  const selection = await selectObjectById(sourcePage, objectId);
  if (!selection.selected) return { ...selection, synced: false };
  await sourcePage.getByRole("button", { name: `Set color ${colorName}`, exact: true }).click();
  await receiverPage.waitForFunction(
    (args) => {
      const object = [...document.querySelectorAll(args.selector)].find(
        (element) => element.getAttribute("data-object-id") === args.objectId,
      );
      return object?.getAttribute("data-object-color") === args.expectedColor;
    },
    { selector: objectSelector, objectId, expectedColor },
    { timeout: 10000 },
  );
  const updated = await objectById(receiverPage, objectId);
  return { objectId, expectedColor, actualColor: updated?.color, synced: updated?.color === expectedColor };
}

async function simultaneousTextEditConflict(pageA, pageB, objectId) {
  const firstText = "Owner conflict edit";
  const secondText = "Collaborator conflict edit";
  const firstOpened = await openObjectEditor(pageA, objectId);
  const secondOpened = await openObjectEditor(pageB, objectId);
  if (!firstOpened.opened || !secondOpened.opened) {
    return { objectId, converged: false, firstOpened, secondOpened };
  }

  await pageA.locator(".object-editor-overlay").fill(firstText);
  await pageB.locator(".object-editor-overlay").fill(secondText);
  await Promise.all([pageA.keyboard.press("Enter"), pageB.keyboard.press("Enter")]);
  await pageA.waitForFunction(
    (args) => {
      const object = [...document.querySelectorAll(args.selector)].find(
        (element) => element.getAttribute("data-object-id") === args.objectId,
      );
      return args.expected.includes(object?.getAttribute("data-object-text"));
    },
    { selector: objectSelector, objectId, expected: [firstText, secondText] },
    { timeout: 10000 },
  );
  await pageB.waitForFunction(
    (args) => {
      const object = [...document.querySelectorAll(args.selector)].find(
        (element) => element.getAttribute("data-object-id") === args.objectId,
      );
      return args.expected.includes(object?.getAttribute("data-object-text"));
    },
    { selector: objectSelector, objectId, expected: [firstText, secondText] },
    { timeout: 10000 },
  );
  let finalA = await objectById(pageA, objectId);
  let finalB = await objectById(pageB, objectId);
  const convergenceStartedAt = Date.now();
  while (
    Date.now() - convergenceStartedAt < 10000 &&
    (!finalA?.text || finalA.text !== finalB?.text || ![firstText, secondText].includes(finalA.text))
  ) {
    await delay(250);
    finalA = await objectById(pageA, objectId);
    finalB = await objectById(pageB, objectId);
  }
  return {
    objectId,
    finalA: finalA?.text,
    finalB: finalB?.text,
    expected: [firstText, secondText],
    converged: Boolean(finalA?.text && finalA.text === finalB?.text && [firstText, secondText].includes(finalA.text)),
  };
}

async function resizeRotateObjectWithTransformer(sourcePage, receiverPage, objectId) {
  if (!objectId) return { objectId, resized: false, rotated: false, reason: "missing object id" };
  const selection = await selectObjectById(sourcePage, objectId);
  const before = await objectById(sourcePage, objectId);
  const box = await sourcePage.locator(canvasSelector).boundingBox();
  if (!selection.selected || !before || !box) return { objectId, resized: false, rotated: false, selection, before };

  await sourcePage.mouse.move(box.x + before.x + before.width, box.y + before.y + before.height);
  await sourcePage.mouse.down();
  await sourcePage.mouse.move(box.x + before.x + before.width + 70, box.y + before.y + before.height + 45, { steps: 8 });
  await sourcePage.mouse.up();
  await receiverPage.waitForFunction(
    (args) => {
      const object = [...document.querySelectorAll(args.selector)].find(
        (element) => element.getAttribute("data-object-id") === args.objectId,
      );
      return Number(object?.getAttribute("data-object-width")) >= args.minWidth;
    },
    { selector: objectSelector, objectId, minWidth: before.width + 30 },
    { timeout: 10000 },
  );
  const resizedObject = await objectById(sourcePage, objectId);
  if (!resizedObject) return { objectId, resized: false, rotated: false, reason: "object missing after resize" };

  await selectObjectById(sourcePage, objectId);
  const rotateStart = {
    x: box.x + resizedObject.x + resizedObject.width / 2,
    y: box.y + resizedObject.y - 50,
  };
  await sourcePage.mouse.move(rotateStart.x, rotateStart.y);
  await sourcePage.mouse.down();
  await sourcePage.mouse.move(rotateStart.x + 90, rotateStart.y + 24, { steps: 10 });
  await sourcePage.mouse.up();
  await receiverPage.waitForFunction(
    (args) => {
      const object = [...document.querySelectorAll(args.selector)].find(
        (element) => element.getAttribute("data-object-id") === args.objectId,
      );
      return Math.abs(Number(object?.getAttribute("data-object-rotation"))) >= 2;
    },
    { selector: objectSelector, objectId },
    { timeout: 10000 },
  );
  const after = await objectById(receiverPage, objectId);
  return {
    objectId,
    before: { width: before.width, height: before.height, rotation: before.rotation },
    after: after ? { width: after.width, height: after.height, rotation: after.rotation } : null,
    resized: Boolean(after && after.width >= before.width + 30),
    rotated: Boolean(after && Math.abs(after.rotation) >= 2),
  };
}

async function duplicateSelectedObject(sourcePage, receiverPage, objectId) {
  const selection = await selectObjectById(sourcePage, objectId);
  if (!selection.selected) return { ...selection, synced: false };
  const sourceBefore = await shapeCount(sourcePage);
  const receiverBefore = await shapeCount(receiverPage);
  await sourcePage.getByRole("button", { name: "Duplicate selection", exact: true }).click();
  await sourcePage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length > args.count,
    { selector: objectSelector, count: sourceBefore },
    { timeout: 10000 },
  );
  await receiverPage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length > args.count,
    { selector: objectSelector, count: receiverBefore },
    { timeout: 10000 },
  );
  return {
    objectId,
    sourceBefore,
    sourceAfter: await shapeCount(sourcePage),
    receiverBefore,
    receiverAfter: await shapeCount(receiverPage),
    synced: (await shapeCount(receiverPage)) > receiverBefore,
  };
}

async function copyPasteSelectedObject(sourcePage, receiverPage, objectId) {
  if (objectId) {
    const selection = await selectObjectById(sourcePage, objectId);
    if (!selection.selected) return { ...selection, synced: false };
  } else if ((await selectedObjectCount(sourcePage)) < 1) {
    return { synced: false, reason: "no selected object to copy" };
  }
  const sourceBefore = await shapeCount(sourcePage);
  const receiverBefore = await shapeCount(receiverPage);
  await sourcePage.getByRole("button", { name: "Copy selection", exact: true }).click();
  await sourcePage.getByRole("button", { name: "Paste selection", exact: true }).click();
  await sourcePage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length > args.count,
    { selector: objectSelector, count: sourceBefore },
    { timeout: 10000 },
  );
  await receiverPage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length > args.count,
    { selector: objectSelector, count: receiverBefore },
    { timeout: 10000 },
  );
  return {
    objectId,
    sourceBefore,
    sourceAfter: await shapeCount(sourcePage),
    receiverBefore,
    receiverAfter: await shapeCount(receiverPage),
    synced: (await shapeCount(receiverPage)) > receiverBefore,
  };
}

async function selectedObjectCount(page) {
  return page.evaluate(
    (selector) =>
      [...document.querySelectorAll(selector)].filter((element) => element.getAttribute("data-object-selected") === "true")
        .length,
    objectSelector,
  );
}

async function openObjectEditor(page, objectId) {
  const object = await objectById(page, objectId);
  const box = await page.locator(canvasSelector).boundingBox();
  if (!object || !box) return { objectId, opened: false, reason: "object or canvas missing" };
  const target =
    object.type === "frame"
      ? { x: box.x + object.x + Math.min(object.width / 2, 80), y: box.y + object.y + 16 }
      : { x: box.x + object.x + object.width / 2, y: box.y + object.y + object.height / 2 };
  await page.mouse.dblclick(target.x, target.y);
  await page.locator(".object-editor-overlay").waitFor({ state: "visible", timeout: 5000 });
  return { objectId, opened: true };
}

async function editStickyText(sourcePage, receiverPage, objectId, text) {
  const opened = await openObjectEditor(sourcePage, objectId);
  if (!opened.opened) return { ...opened, synced: false };
  await sourcePage.locator(".object-editor-overlay").fill(text);
  await sourcePage.keyboard.press("Enter");
  await waitForObjectText(receiverPage, text, 0);
  const updated = await objectByText(receiverPage, text);
  return { objectId, text, synced: updated?.id === objectId };
}

async function moveObjectWithMouse(sourcePage, receiverPage, objectId, deltaX, deltaY) {
  const object = await objectById(sourcePage, objectId);
  const box = await sourcePage.locator(canvasSelector).boundingBox();
  if (!object || !box) return { objectId, synced: false, reason: "object or canvas missing" };
  await sourcePage.mouse.move(box.x + object.x + object.width / 2, box.y + object.y + object.height / 2);
  await sourcePage.mouse.down();
  await sourcePage.mouse.move(box.x + object.x + object.width / 2 + deltaX, box.y + object.y + object.height / 2 + deltaY, {
    steps: 6,
  });
  await sourcePage.mouse.up();
  await receiverPage.waitForFunction(
    (args) => {
      const object = [...document.querySelectorAll(args.selector)].find(
        (element) => element.getAttribute("data-object-id") === args.objectId,
      );
      if (!object) return false;
      return Number(object.getAttribute("data-object-x")) >= args.minX;
    },
    { selector: objectSelector, objectId, minX: object.x + deltaX - 12 },
    { timeout: 10000 },
  );
  const moved = await objectById(receiverPage, objectId);
  return {
    objectId,
    before: { x: object.x, y: object.y },
    after: moved ? { x: moved.x, y: moved.y } : null,
    synced: Boolean(moved && moved.x >= object.x + deltaX - 12),
  };
}

async function runAiCommandExpectShape(sourcePage, receiverPage, command) {
  const sourceBefore = await shapeCount(sourcePage);
  const receiverBefore = await shapeCount(receiverPage);
  await sourcePage.locator(".ai-panel textarea").fill(command);
  const startedAt = Date.now();
  const responsePromise = sourcePage.waitForResponse(
    (response) => response.url().includes("/api/ai-command") && response.request().method() === "POST",
    { timeout: 70000 },
  );
  await sourcePage.getByRole("button", { name: "Run command" }).click();
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`AI command failed with ${response.status()}: ${(await response.text()).slice(0, 500)}`);
  }
  await sourcePage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length > args.count,
    { selector: objectSelector, count: sourceBefore },
    { timeout: 30000 },
  );
  const latencyMs = Date.now() - startedAt;
  await receiverPage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length > args.count,
    { selector: objectSelector, count: receiverBefore },
    { timeout: 30000 },
  );
  const status = sourcePage.locator(".form-status").last();
  return {
    command,
    latencyMs,
    mode: await status.getAttribute("data-ai-mode").catch(() => null),
    sourceBefore,
    sourceAfter: await shapeCount(sourcePage),
    receiverBefore,
    receiverAfter: await shapeCount(receiverPage),
    synced: (await shapeCount(sourcePage)) > sourceBefore && (await shapeCount(receiverPage)) > receiverBefore,
    status: await status.innerText().catch(() => ""),
  };
}

async function simultaneousAiCommands(pageA, pageB) {
  const beforeA = await shapeCount(pageA);
  const beforeB = await shapeCount(pageB);
  const [first, second] = await Promise.all([
    runAiCommand(pageA, "Add a yellow sticky note that says Parallel A", null, "openai"),
    runAiCommand(pageB, "Create a blue rectangle at position 100, 200", null, "openai"),
  ]);
  await pageA.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length >= args.target,
    { selector: objectSelector, target: beforeA + 2 },
    { timeout: 15000 },
  );
  await pageB.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length >= args.target,
    { selector: objectSelector, target: beforeB + 2 },
    { timeout: 15000 },
  );
  return {
    beforeA,
    beforeB,
    afterA: await shapeCount(pageA),
    afterB: await shapeCount(pageB),
    first,
    second,
    synced: (await shapeCount(pageA)) >= beforeA + 2 && (await shapeCount(pageB)) >= beforeB + 2,
  };
}

async function dragSelectObjects(page, minimumSelected) {
  const box = await page.locator(canvasSelector).boundingBox();
  if (!box) return { selectedCount: 0, reason: "canvas missing" };
  await page.keyboard.down("Shift");
  await page.mouse.move(box.x + 24, box.y + 96);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(1160, box.width - 24), box.y + Math.min(680, box.height - 24), { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  try {
    await waitForSelectedObjectCount(page, minimumSelected, 5000);
    return { selectedCount: await selectedObjectCount(page), mode: "drag" };
  } catch (error) {
    const fallback = await shiftClickSelectObjects(page, minimumSelected);
    return {
      ...fallback,
      dragError: error instanceof Error ? error.message : String(error),
      mode: fallback.selectedCount >= minimumSelected ? "shift-click-fallback" : "drag-failed",
    };
  }
}

async function shiftClickSelectObjects(page, minimumSelected) {
  const objects = await page.evaluate((args) => {
    const objectFromProbe = (element) => ({
      height: Number(element.getAttribute("data-object-height")),
      id: element.getAttribute("data-object-id"),
      width: Number(element.getAttribute("data-object-width")),
      x: Number(element.getAttribute("data-object-x")),
      y: Number(element.getAttribute("data-object-y")),
    });
    return [...document.querySelectorAll(args.selector)]
      .map(objectFromProbe)
      .filter((object) => object.width >= 40 && object.height >= 40)
      .slice(0, Math.max(2, args.minimumSelected));
  }, { selector: objectSelector, minimumSelected });
  if (objects.length < minimumSelected) {
    return { selectedCount: await selectedObjectCount(page), reason: "not enough selectable objects" };
  }

  const canvas = page.locator(canvasSelector).first();
  await canvas.click({
    position: { x: objects[0].x + objects[0].width / 2, y: objects[0].y + objects[0].height / 2 },
  });
  for (const object of objects.slice(1, minimumSelected)) {
    await canvas.click({
      modifiers: ["Shift"],
      position: { x: object.x + object.width / 2, y: object.y + object.height / 2 },
    });
  }
  await waitForSelectedObjectCount(page, minimumSelected, 5000);
  return { selectedCount: await selectedObjectCount(page) };
}

async function waitForSelectedObjectCount(page, minimumSelected, timeout) {
  await page.waitForFunction(
    (args) =>
      [...document.querySelectorAll(args.selector)].filter(
        (element) => element.getAttribute("data-object-selected") === "true",
      ).length >= args.minimumSelected,
    { selector: objectSelector, minimumSelected },
    { timeout },
  );
}

async function waitForObjectText(page, text, previousCount) {
  await page.waitForFunction(
    (args) =>
      [...document.querySelectorAll(args.selector)].some(
        (element) =>
          document.querySelectorAll(args.selector).length > args.previousCount &&
          element.getAttribute("data-object-text") === args.text,
      ),
    { selector: objectSelector, text, previousCount },
    { timeout: 10000 },
  );
}

async function objectIds(page) {
  return page.evaluate((selector) => {
    return [...document.querySelectorAll(selector)].map((element) => element.getAttribute("data-object-id")).filter(Boolean);
  }, objectSelector);
}

async function objectByText(page, text) {
  return page.evaluate(
    (args) => {
      const objectFromProbe = (element) => ({
        color: element.getAttribute("data-object-color"),
        height: Number(element.getAttribute("data-object-height")),
        id: element.getAttribute("data-object-id"),
        rotation: Number(element.getAttribute("data-object-rotation")),
        selected: element.getAttribute("data-object-selected") === "true",
        text: element.getAttribute("data-object-text"),
        type: element.getAttribute("data-object-type"),
        width: Number(element.getAttribute("data-object-width")),
        x: Number(element.getAttribute("data-object-x")),
        y: Number(element.getAttribute("data-object-y")),
      });
      const element = [...document.querySelectorAll(args.selector)].find(
        (node) => node.getAttribute("data-object-text") === args.text,
      );
      return element ? objectFromProbe(element) : null;
    },
    { selector: objectSelector, text },
  );
}

async function objectById(page, objectId) {
  return page.evaluate(
    (args) => {
      const objectFromProbe = (element) => ({
        color: element.getAttribute("data-object-color"),
        height: Number(element.getAttribute("data-object-height")),
        id: element.getAttribute("data-object-id"),
        rotation: Number(element.getAttribute("data-object-rotation")),
        selected: element.getAttribute("data-object-selected") === "true",
        text: element.getAttribute("data-object-text"),
        type: element.getAttribute("data-object-type"),
        width: Number(element.getAttribute("data-object-width")),
        x: Number(element.getAttribute("data-object-x")),
        y: Number(element.getAttribute("data-object-y")),
      });
      const element = [...document.querySelectorAll(args.selector)].find(
        (node) => node.getAttribute("data-object-id") === args.objectId,
      );
      return element ? objectFromProbe(element) : null;
    },
    { selector: objectSelector, objectId },
  );
}

async function installShapeObserver(page, target) {
  await page.evaluate((targetCount) => {
    window.__collabSmokeShapeAt = null;
    const countShapes = () => document.querySelectorAll(".board-object-probe").length;
    if (countShapes() >= targetCount) {
      window.__collabSmokeShapeAt = Date.now();
      return;
    }
    const observer = new MutationObserver(() => {
      if (countShapes() >= targetCount) {
        window.__collabSmokeShapeAt = Date.now();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, target);
}

async function measureCursorLatency(sourcePage, receiverPage, sourceName) {
  const box = await sourcePage.locator(canvasSelector).boundingBox();
  if (!box) return null;
  await sourcePage.bringToFront();
  await sourcePage.locator(canvasSelector).click({ position: { x: 80, y: 80 } });
  await sourcePage.mouse.move(box.x + 140, box.y + 140);
  await receiverPage
    .waitForFunction(
      (name) =>
        [...document.querySelectorAll(".board-cursor")].some(
          (element) => element.getAttribute("data-cursor-name") === name,
        ),
      sourceName,
      { timeout: 3000 },
    )
    .catch(() => null);

  await receiverPage.evaluate(() => {
    window.__collabSmokeCursorChangedAt = null;
  });
  await sourcePage.evaluate(() => {
    window.__collabSmokeCursorSentAt = null;
    const recordPointerMove = () => {
      window.__collabSmokeCursorSentAt = Date.now();
      document.removeEventListener("pointermove", recordPointerMove, true);
    };
    document.addEventListener("pointermove", recordPointerMove, true);
  });
  await receiverPage.evaluate((name) => {
    const snapshot = () =>
      [...document.querySelectorAll(".board-cursor")]
        .filter((element) => element.getAttribute("data-cursor-name") === name)
        .map((element) => `${element.textContent}:${element.getAttribute("style")}`)
        .join("|");
    const initial = snapshot();
    const observer = new MutationObserver(() => {
      if (snapshot() && snapshot() !== initial) {
        window.__collabSmokeCursorChangedAt = Date.now();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { attributes: true, childList: true, subtree: true });
  }, sourceName);

  await sourcePage.mouse.move(box.x + 320, box.y + 260);
  await receiverPage
    .waitForFunction(() => window.__collabSmokeCursorChangedAt, null, {
      timeout: 3000,
    })
    .catch(() => null);

  const changedAt = await receiverPage.evaluate(() => window.__collabSmokeCursorChangedAt);
  const sentAt = await sourcePage.evaluate(() => window.__collabSmokeCursorSentAt);
  return typeof changedAt === "number" && typeof sentAt === "number" ? Math.max(0, changedAt - sentAt) : null;
}

async function measureCursorTracking(sourcePage, receiverPage, sourceName) {
  const sourceBox = await sourcePage.locator(canvasSelector).boundingBox();
  if (!sourceBox) return { aligned: false, reason: "source canvas missing" };
  const target = { x: 420, y: 300 };
  await sourcePage.bringToFront();
  await sourcePage.mouse.move(sourceBox.x + target.x, sourceBox.y + target.y);
  await receiverPage.waitForFunction(
    (args) => {
      const cursor = [...document.querySelectorAll(".board-cursor")].find(
        (element) => element.getAttribute("data-cursor-name") === args.name,
      );
      if (!cursor) return false;
      const x = Number(cursor.getAttribute("data-cursor-screen-x"));
      const y = Number(cursor.getAttribute("data-cursor-screen-y"));
      return Math.abs(x - args.target.x) <= args.tolerance && Math.abs(y - args.target.y) <= args.tolerance;
    },
    { name: sourceName, target, tolerance: 6 },
    { timeout: 5000 },
  );
  const measured = await receiverPage.evaluate((name) => {
    const cursor = [...document.querySelectorAll(".board-cursor")].find(
      (element) => element.getAttribute("data-cursor-name") === name,
    );
    return {
      screenX: Number(cursor?.getAttribute("data-cursor-screen-x")),
      screenY: Number(cursor?.getAttribute("data-cursor-screen-y")),
    };
  }, sourceName);
  return {
    target,
    ...measured,
    deltaX: Math.abs(measured.screenX - target.x),
    deltaY: Math.abs(measured.screenY - target.y),
    aligned: Math.abs(measured.screenX - target.x) <= 6 && Math.abs(measured.screenY - target.y) <= 6,
  };
}

async function measureDuplicateUserLabels(observerPage, duplicatePage, baseName) {
  const numberedName = `${baseName} (2)`;
  await observerPage.waitForFunction(
    (args) => {
      const names = [...document.querySelectorAll(".presence-pill")].map((element) =>
        element.getAttribute("data-presence-name"),
      );
      return names.includes(args.baseName) && names.includes(args.numberedName);
    },
    { baseName, numberedName },
    { timeout: 10000 },
  );

  const duplicateBox = await duplicatePage.locator(canvasSelector).boundingBox();
  if (duplicateBox) {
    await duplicatePage.bringToFront();
    await duplicatePage.mouse.move(duplicateBox.x + 260, duplicateBox.y + 210);
    await observerPage.waitForFunction(
      (name) =>
        [...document.querySelectorAll(".board-cursor")].some(
          (element) => element.getAttribute("data-cursor-name") === name,
        ),
      numberedName,
      { timeout: 5000 },
    );
  }

  const labels = await observerPage.evaluate(() => ({
    cursorNames: [...document.querySelectorAll(".board-cursor")].map((element) =>
      element.getAttribute("data-cursor-name"),
    ),
    presenceNames: [...document.querySelectorAll(".presence-pill")].map((element) =>
      element.getAttribute("data-presence-name"),
    ),
  }));

  const presenceNumbered = labels.presenceNames.includes(baseName) && labels.presenceNames.includes(numberedName);
  const cursorNumbered = labels.cursorNames.includes(numberedName);

  return {
    baseName,
    numberedName,
    ...labels,
    presenceNumbered,
    cursorNumbered,
    ok: presenceNumbered && cursorNumbered,
  };
}

async function reconnectRecovery(sourcePage, receiverContext, receiverPage) {
  const before = await shapeCount(receiverPage);
  await receiverContext.setOffline(true);
  const localCreate = await createToolbarStickyLocal(sourcePage, "Reconnect smoke sticky");
  await receiverPage.waitForTimeout(1000);
  await receiverContext.setOffline(false);
  await receiverPage.waitForFunction(
    (args) => document.querySelectorAll(args.selector).length >= args.target,
    { selector: objectSelector, target: before + 1 },
    { timeout: 30000 },
  );
  pass("disconnect/reconnect recovery", {
    before,
    localCreate,
    after: await shapeCount(receiverPage),
  });
}

async function measureInteractionFps(page) {
  const fpsPromise = page.evaluate(
    (durationMs) =>
      new Promise((resolve) => {
        let frames = 0;
        let firstFrameAt = 0;
        const frame = (now) => {
          if (!firstFrameAt) firstFrameAt = now;
          frames += 1;
          if (now - firstFrameAt >= durationMs) {
            resolve((frames * 1000) / (now - firstFrameAt));
          } else {
            requestAnimationFrame(frame);
          }
        };
        requestAnimationFrame(frame);
      }),
    1800,
  );

  const box = await page.locator(canvasSelector).boundingBox();
  if (box) {
    await page.mouse.move(box.x + 420, box.y + 320);
    await page.mouse.down();
    for (let step = 0; step < 12; step += 1) {
      await page.mouse.move(box.x + 420 + step * 10, box.y + 320 + step * 6);
    }
    await page.mouse.up();
    await page.mouse.wheel(0, -350);
    await page.mouse.wheel(0, 250);
  }

  return Number(await fpsPromise);
}

async function shapeCount(page) {
  return page.locator(objectSelector).count();
}

async function storedShapeCount(boardId) {
  const roomId = await roomIdForBoard(boardId);
  const liveblocks = new Liveblocks({ secret: requireEnv("LIVEBLOCKS_SECRET_KEY") });
  const document = await liveblocks.getStorageDocument(roomId, "json");
  const objects = document?.objects && typeof document.objects === "object" ? document.objects : {};
  return Object.values(objects).filter((object) => object && typeof object === "object" && typeof object.id === "string")
    .length;
}

async function seedCapacityObjects(boardId, count, actorUserId) {
  const roomId = await roomIdForBoard(boardId);
  const liveblocks = new Liveblocks({ secret: requireEnv("LIVEBLOCKS_SECRET_KEY") });
  const startedAt = Date.now();
  await liveblocks.mutateStorage(roomId, async ({ root }) => {
    let objects = root.get("objects");
    if (!objects) {
      objects = new LiveMap();
      root.set("objects", objects);
    }

    const now = Date.now();
    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / 25);
      const col = index % 25;
      const id = `capacity-${runId}-${index}`;
      objects.set(
        id,
        new LiveObject({
          id,
          type: "sticky",
          x: 80 + col * 210,
          y: 120 + row * 170,
          width: 180,
          height: 130,
          rotation: 0,
          color: "#fde68a",
          zIndex: 1000 + index,
          createdAt: now,
          updatedAt: now,
          updatedBy: actorUserId,
          text: `Capacity ${index + 1}`,
        }),
      );
    }
  });

  return { latencyMs: Date.now() - startedAt };
}

async function waitForStoredShapeCount(boardId, minimum, timeoutMs) {
  const startedAt = Date.now();
  let lastCount = 0;
  while (Date.now() - startedAt < timeoutMs) {
    lastCount = await storedShapeCount(boardId);
    if (lastCount >= minimum) return lastCount;
    await delay(1000);
  }
  throw new Error(`Timed out waiting for ${minimum} stored shapes; last count was ${lastCount}`);
}

async function roomIdForBoard(boardId) {
  const client = adminClient ?? createAdminClient();
  if (!client) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to inspect board storage");
  const { data, error } = await client.from("boards").select("room_id").eq("id", boardId).single();
  if (error) throw error;
  return data.room_id;
}

async function createSmokeUsers(count) {
  const users = [];
  for (let index = 0; index < count; index += 1) {
    const email = `collabboard-smoke+${runId}-${index}@example.com`;
    const password = `Smoke-${runId}-${index}-${Math.random().toString(36).slice(2)}!`;
    const name = `Smoke ${index + 1}`;
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (error) throw error;
    users.push({ id: data.user.id, email, password, name });
  }
  return users;
}

function createAnonymousUsers(count) {
  return Array.from({ length: count }, (_, index) => ({ name: `Smoke ${index + 1}` }));
}

async function cleanupSmokeUsers(users) {
  await Promise.all(
    users
      .filter((user) => user.id)
      .map((user) => adminClient.auth.admin.deleteUser(user.id).then(({ error }) => {
        if (error) throw error;
      })),
  );
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
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

function valueFor(argName, envName, fallback) {
  return options.get(argName) ?? process.env[envName] ?? fallback;
}

function numberFor(argName, envName, fallback) {
  const value = Number(valueFor(argName, envName, fallback));
  if (!Number.isFinite(value)) throw new Error(`${argName} must be a number`);
  return value;
}

function booleanFor(argName, envName, fallback) {
  const value = valueFor(argName, envName, String(fallback));
  return value === true || value === "true" || value === "1" || value === "yes";
}

function requireEnv(key) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function pass(name, details) {
  results.checks.push({ name, status: "pass", details });
  console.log(`PASS ${name} ${JSON.stringify(details)}`);
}

function fail(name, details) {
  results.checks.push({ name, status: "fail", details });
  console.error(`FAIL ${name} ${JSON.stringify(details)}`);
}

function check(name, condition, details) {
  if (condition) {
    pass(name, details);
  } else {
    fail(name, details);
  }
}

function writeReport() {
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify({ ...results, completedAt: new Date().toISOString() }, null, 2)}\n`);
}
