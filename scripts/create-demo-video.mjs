#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "output/demo");
const publicDemoDir = path.join(rootDir, "public/demo");
mkdirSync(outputDir, { recursive: true });
mkdirSync(publicDemoDir, { recursive: true });

const magick = requireCommand("magick");
const ffmpeg = requireCommand("ffmpeg");
const say = requireCommand("say");
const regularFont = "/System/Library/Fonts/Supplemental/Arial.ttf";
const boldFont = "/System/Library/Fonts/Supplemental/Arial Bold.ttf";

const screenshots = {
  board: path.join(rootDir, "output/playwright/ui-board-desktop.png"),
  home: path.join(rootDir, "output/playwright/ui-home-desktop.png"),
  proof: path.join(rootDir, "output/playwright/reference-visual-desktop.png"),
};

for (const [name, filePath] of Object.entries(screenshots)) {
  if (!existsSync(filePath)) throw new Error(`Missing ${name} screenshot at ${filePath}`);
}

const narration = `Flex Canvas is a realtime collaborative whiteboard built for the Gauntlet AI CollabBoard assignment.
The implementation uses Supabase for authentication, profiles, board metadata, memberships, and AI command logs.
Liveblocks owns the realtime room, presence, and canonical custom Storage object map.
React Konva renders the custom canvas, including sticky notes, shapes, text, frames, lines, connectors, selection, pan, zoom, resize, and rotate.

The core collaboration flow starts with an authenticated user creating a board.
Five browser users can join the same room, see each other in the presence list, and receive named live cursors.
Human edits are client-owned Liveblocks Storage mutations for low latency.
The local smoke verifies sticky note creation, text editing, object movement, color changes, duplicate, copy, paste, line creation, arrow connector creation, frame creation, frame title editing, drag select, and resize plus rotate transforms.

AI commands are deliberately server-owned.
The client sends the command plus compact board context to the API route.
The server checks Supabase authentication and board access, reads compact Liveblocks Storage state, runs deterministic handlers first, falls back to OpenAI for freeform commands, validates every operation, applies the mutation to Liveblocks Storage, and logs usage back to Supabase.
Deterministic coverage includes sticky notes, rectangles, named frames, SWOT, retrospectives, sticky grids, selected color changes, moving pink notes, grid layout, resize frame to contents, even spacing, user journey maps, and board state summaries.

The conflict policy is simple and documented: last write wins.
The expanded smoke proves simultaneous text edits converge across clients, and simultaneous deterministic AI commands from two users both sync into the same board.
The latest production smoke report passes thirty one checks, including five user join, cursor latency, object sync latency, mobile layout, refresh persistence, reconnect recovery, five hundred plus stored objects, and interaction frame rate.

The deployed app is live, the demo video is published from the app itself, and the submission package includes setup docs, architecture notes, pre-search, AI development notes, cost analysis, production smoke evidence, and public screenshots for the social post.`;

const slides = [
  {
    type: "text",
    title: "Flex Canvas",
    subtitle: "Realtime collaborative whiteboard with Supabase Auth, Liveblocks custom Storage, React Konva, and server-side AI commands.",
  },
  {
    type: "image",
    image: screenshots.home,
    title: "Authenticated App Surface",
    subtitle: "Users start from the deployed app, sign in, and create or open boards.",
  },
  {
    type: "image",
    image: screenshots.board,
    title: "Custom Multiplayer Canvas",
    subtitle: "Sticky notes, shapes, text, frames, connectors, pan, zoom, selection, resize, and rotate are rendered with React Konva.",
  },
  {
    type: "text",
    title: "Realtime Ownership",
    subtitle: "Supabase owns auth and metadata. Liveblocks owns room auth, presence, and canonical board objects. Human edits are low-latency client mutations.",
  },
  {
    type: "text",
    title: "Server-Side AI Path",
    subtitle: "AI commands are planned server-side, validated through one BoardOperation schema, applied to Liveblocks Storage, and logged to Supabase.",
  },
  {
    type: "text",
    title: "Deterministic Command Coverage",
    subtitle: "SWOT, retrospective, sticky grids, user journey maps, frame-fit resize, even spacing, color changes, pink-note moves, and board-state summaries.",
  },
  {
    type: "image",
    image: screenshots.proof,
    title: "Production Proof",
    subtitle: "Production smoke passes five-user join, presence, cursors, object sync, conflict convergence, transforms, mobile layout, reconnect, 500+ objects, and FPS.",
  },
  {
    type: "text",
    title: "Submission Package",
    subtitle: "The deployed app, public demo, screenshots, setup docs, architecture overview, AI log, cost analysis, and @GauntletAI social copy are ready.",
  },
];

const slideFiles = slides.map((slide, index) => {
  const outputPath = path.join(outputDir, `slide-${String(index + 1).padStart(2, "0")}.png`);
  if (slide.type === "image") {
    makeImageSlide(slide.image, slide.title, slide.subtitle, outputPath);
  } else {
    makeTextSlide(slide.title, slide.subtitle, outputPath);
  }
  return outputPath;
});

const narrationPath = path.join(outputDir, "flex-canvas-demo-narration.txt");
const audioPath = path.join(outputDir, "flex-canvas-demo-narration.aiff");
const concatPath = path.join(outputDir, "slides.txt");
const videoPath = path.join(outputDir, "flex-canvas-demo-draft.mp4");
const publicVideoPath = path.join(publicDemoDir, "flex-canvas-demo-draft.mp4");
writeFileSync(narrationPath, narration);
run(say, ["-r", "145", "-o", audioPath, "-f", narrationPath]);
writeFileSync(
  concatPath,
  `${slideFiles.map((filePath) => `file '${filePath.replace(/'/g, "'\\''")}'\nduration 30`).join("\n")}\nfile '${slideFiles.at(-1)}'\n`,
);
run(ffmpeg, [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatPath,
  "-i",
  audioPath,
  "-vf",
  "scale=1280:720,format=yuv420p",
  "-r",
  "30",
  "-c:v",
  "libx264",
  "-c:a",
  "aac",
  "-b:a",
  "160k",
  "-movflags",
  "+faststart",
  videoPath,
]);
copyFileSync(videoPath, publicVideoPath);

console.log(videoPath);
console.log(publicVideoPath);

function makeTextSlide(title, subtitle, outputPath) {
  run(magick, [
    "-size",
    "1280x720",
    "xc:#f6f7f9",
    "-fill",
    "#2563eb",
    "-draw",
    "rectangle 80,92 112,124",
    "-fill",
    "#f9a8d4",
    "-draw",
    "circle 112,620 176,620",
    "-fill",
    "#111827",
    "-font",
    boldFont,
    "-pointsize",
    "68",
    "-gravity",
    "NorthWest",
    "-annotate",
    "+120+160",
    title,
    "-fill",
    "#475569",
    "-font",
    regularFont,
    "-pointsize",
    "31",
    "-interline-spacing",
    "9",
    "-annotate",
    "+120+270",
    wrap(subtitle, 52),
    outputPath,
  ]);
}

function makeImageSlide(sourcePath, title, subtitle, outputPath) {
  const framedPath = path.join(outputDir, `${path.basename(outputPath, ".png")}-framed.png`);
  run(magick, [
    sourcePath,
    "-resize",
    "1040x445",
    "-background",
    "#ffffff",
    "-gravity",
    "Center",
    "-extent",
    "1040x445",
    "-bordercolor",
    "#d7dce3",
    "-border",
    "2",
    framedPath,
  ]);
  run(magick, [
    "-size",
    "1280x720",
    "xc:#f6f7f9",
    framedPath,
    "-gravity",
    "NorthWest",
    "-geometry",
    "+120+220",
    "-composite",
    "-fill",
    "#111827",
    "-font",
    boldFont,
    "-pointsize",
    "48",
    "-annotate",
    "+120+72",
    title,
    "-fill",
    "#475569",
    "-font",
    regularFont,
    "-pointsize",
    "26",
    "-interline-spacing",
    "7",
    "-annotate",
    "+120+138",
    wrap(subtitle, 70),
    outputPath,
  ]);
}

function wrap(text, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

function requireCommand(command) {
  const result = spawnSync("which", [command], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} is required`);
  return result.stdout.trim();
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "pipe", encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed:\n${result.stderr || result.stdout}`);
  }
}
