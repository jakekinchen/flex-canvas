import type { AiCommandPlan, AiCommandRequest, BoardOperation, CompactShape } from "@/lib/ai/schema";

function normalized(command: string) {
  return command.toLowerCase().replace(/\s+/g, " ").trim();
}

function viewportOrigin(request: AiCommandRequest) {
  const { x, y } = request.context.viewportBounds;
  return { x: x + 120, y: y + 120 };
}

function colorOf(shape: CompactShape) {
  return (shape.color ?? "").toLowerCase();
}

function uniqueShapes(...groups: CompactShape[][]) {
  const shapes = new Map<string, CompactShape>();
  for (const group of groups) {
    for (const shape of group) shapes.set(shape.id, shape);
  }
  return [...shapes.values()];
}

function objectWidth(shape: CompactShape) {
  return shape.width ?? 180;
}

function objectHeight(shape: CompactShape) {
  return shape.height ?? 140;
}

function objectCenter(shape: CompactShape) {
  return {
    x: shape.x + objectWidth(shape) / 2,
    y: shape.y + objectHeight(shape) / 2,
  };
}

function contains(frame: CompactShape, shape: CompactShape) {
  const center = objectCenter(shape);
  return (
    center.x >= frame.x &&
    center.x <= frame.x + objectWidth(frame) &&
    center.y >= frame.y &&
    center.y <= frame.y + objectHeight(frame)
  );
}

export function tryDeterministicCommand(request: AiCommandRequest): AiCommandPlan | null {
  const command = normalized(request.command);

  if (command.includes("get board state") || command.includes("getboardstate") || command.includes("current board")) {
    return summarizeBoardState(request);
  }

  if (command.includes("swot")) {
    return createSwot(request);
  }

  if (command.includes("user journey")) {
    return createUserJourneyMap(request);
  }

  const stickyNote = parseStickyNote(command);
  if (stickyNote) {
    const { x, y } = viewportOrigin(request);
    return {
      message: `Created a ${stickyNote.color} sticky note.`,
      operations: [
        {
          type: "createStickyNote",
          text: stickyNote.text,
          x,
          y,
          color: stickyNote.color,
        },
      ],
    };
  }

  const rectangle = parseRectangle(command);
  if (rectangle) {
    return {
      message: `Created a ${rectangle.color} rectangle.`,
      operations: [
        {
          type: "createShape",
          shapeType: "rectangle",
          x: rectangle.x,
          y: rectangle.y,
          width: 240,
          height: 140,
          color: rectangle.color,
        },
      ],
    };
  }

  const frameTitle = parseFrame(command);
  if (frameTitle) {
    const { x, y } = viewportOrigin(request);
    return {
      message: `Created a frame called ${frameTitle}.`,
      operations: [{ type: "createFrame", title: frameTitle, x, y, width: 640, height: 420 }],
    };
  }

  if (command.includes("retrospective") || command.includes("retro board")) {
    return createRetrospective(request);
  }

  if (command.includes("arrange") && command.includes("grid")) {
    return arrangeGrid(request);
  }

  if (command.includes("resize") && command.includes("frame") && command.includes("fit")) {
    return resizeFrameToFitContents(request);
  }

  if (command.includes("space") && command.includes("even")) {
    return spaceEvenly(request);
  }

  const stickyGridMatch = command.match(/(\d{1,2})\s*x\s*(\d{1,2}).*sticky/);
  if (stickyGridMatch) {
    const rows = Math.min(Number(stickyGridMatch[1]), 25);
    const cols = Math.min(Number(stickyGridMatch[2]), 25);
    return createStickyGrid(request, rows, cols);
  }

  if (command.includes("move all pink") && command.includes("right")) {
    return movePinkNotesRight(request);
  }

  if (command.includes("change") && command.includes("selected") && command.includes("green")) {
    const operations = request.context.selectedShapes.map<BoardOperation>((shape) => ({
      type: "changeColor",
      objectId: shape.id,
      color: "green",
    }));
    return { message: "Changed selected shapes to green.", operations };
  }

  return null;
}

function summarizeBoardState(request: AiCommandRequest): AiCommandPlan {
  const shapes = uniqueShapes(
    request.context.selectedShapes,
    request.context.candidateShapes,
    request.context.viewportShapes,
  );
  const counts = shapes.reduce<Record<string, number>>((total, shape) => {
    total[shape.type] = (total[shape.type] ?? 0) + 1;
    return total;
  }, {});
  const summary = Object.entries(counts)
    .map(([type, count]) => `${count} ${type}`)
    .join(", ");

  return {
    message: summary ? `Current board context: ${summary}.` : "Current board context is empty.",
    operations: [],
  };
}

function parseStickyNote(command: string) {
  const stickyMatch = command.match(/(?:add|create).*(yellow|pink|blue|green|orange|purple).*sticky note.*(?:says|that says|called|titled)\s+['"]?([^'"]+)['"]?/i);
  if (!stickyMatch) return null;
  return { color: stickyMatch[1] as "yellow" | "pink" | "blue" | "green" | "orange" | "purple", text: stickyMatch[2].trim() };
}

function parseRectangle(command: string) {
  const rectangleMatch = command.match(
    /(?:add|create).*(yellow|pink|blue|green|orange|purple|red|black|white|gray|grey).*rectangle.*position\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i,
  );
  if (!rectangleMatch) return null;
  return {
    color: rectangleMatch[1] === "gray" ? "grey" : rectangleMatch[1],
    x: Number(rectangleMatch[2]),
    y: Number(rectangleMatch[3]),
  };
}

function parseFrame(command: string) {
  const frameMatch = command.match(/(?:add|create).*(?:frame).*?(?:called|titled|named)\s+['"]?([^'"]+)['"]?/i);
  return frameMatch?.[1]?.trim() || null;
}

function createSwot(request: AiCommandRequest): AiCommandPlan {
  const { x, y } = viewportOrigin(request);
  const frameWidth = 780;
  const frameHeight = 620;
  const colWidth = 340;
  const rowHeight = 220;
  const gap = 28;
  const items = [
    ["Strengths", "Internal advantages"],
    ["Weaknesses", "Internal risks"],
    ["Opportunities", "External upside"],
    ["Threats", "External risks"],
  ];

  const operations: BoardOperation[] = [
    { type: "createFrame", title: "SWOT Analysis", x, y, width: frameWidth, height: frameHeight },
  ];

  items.forEach(([title, note], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const sectionX = x + 40 + col * (colWidth + gap);
    const sectionY = y + 70 + row * (rowHeight + gap);
    operations.push({
      type: "createShape",
      shapeType: "rectangle",
      x: sectionX,
      y: sectionY,
      width: colWidth,
      height: rowHeight,
      color: "blue",
    });
    operations.push({ type: "createText", text: title, x: sectionX + 18, y: sectionY + 18, fontSize: 28 });
    operations.push({
      type: "createStickyNote",
      text: note,
      x: sectionX + 26,
      y: sectionY + 78,
      color: index === 0 ? "green" : index === 1 ? "pink" : index === 2 ? "blue" : "orange",
    });
  });

  return { message: "Created a SWOT analysis template.", operations };
}

function createRetrospective(request: AiCommandRequest): AiCommandPlan {
  const { x, y } = viewportOrigin(request);
  const columns = [
    ["What Went Well", "Wins, bright spots, and strong habits", "green"],
    ["What Didn't", "Friction, misses, and blockers", "pink"],
    ["Action Items", "Owners and next steps", "yellow"],
  ] as const;
  const operations: BoardOperation[] = [
    { type: "createFrame", title: "Retrospective", x, y, width: 980, height: 560 },
  ];

  columns.forEach(([title, note, color], index) => {
    const columnX = x + 42 + index * 305;
    operations.push({
      type: "createShape",
      shapeType: "rectangle",
      x: columnX,
      y: y + 80,
      width: 275,
      height: 420,
      color: "blue",
    });
    operations.push({ type: "createText", text: title, x: columnX + 18, y: y + 104, fontSize: 24 });
    operations.push({ type: "createStickyNote", text: note, x: columnX + 28, y: y + 178, color });
  });

  return { message: "Created a retrospective board.", operations };
}

function createUserJourneyMap(request: AiCommandRequest): AiCommandPlan {
  const { x, y } = viewportOrigin(request);
  const stages = ["Discover", "Evaluate", "Try", "Adopt", "Expand"];
  const columnWidth = 190;
  const gap = 18;
  const operations: BoardOperation[] = [
    { type: "createFrame", title: "User Journey Map", x, y, width: 1120, height: 560 },
    { type: "createText", text: "User Journey Map", x: x + 36, y: y + 30, fontSize: 30 },
  ];

  stages.forEach((stage, index) => {
    const columnX = x + 36 + index * (columnWidth + gap);
    operations.push({
      type: "createShape",
      shapeType: "rectangle",
      x: columnX,
      y: y + 92,
      width: columnWidth,
      height: 400,
      color: index % 2 === 0 ? "blue" : "purple",
    });
    operations.push({ type: "createText", text: stage, x: columnX + 16, y: y + 116, fontSize: 22 });
    operations.push({
      type: "createStickyNote",
      text: `${stage} insight`,
      x: columnX + 18,
      y: y + 180,
      width: 154,
      height: 128,
      color: index % 2 === 0 ? "yellow" : "green",
    });
    operations.push({
      type: "createStickyNote",
      text: `${stage} friction`,
      x: columnX + 18,
      y: y + 326,
      width: 154,
      height: 128,
      color: index % 2 === 0 ? "pink" : "orange",
    });
  });

  return { message: "Created a five-stage user journey map.", operations };
}

function createStickyGrid(request: AiCommandRequest, rows: number, cols: number): AiCommandPlan {
  const { x, y } = viewportOrigin(request);
  const operations: BoardOperation[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      operations.push({
        type: "createStickyNote",
        text: `Idea ${row * cols + col + 1}`,
        x: x + col * 190,
        y: y + row * 170,
        color: "yellow",
      });
    }
  }

  return { message: `Created a ${rows}x${cols} sticky note grid.`, operations };
}

function arrangeGrid(request: AiCommandRequest): AiCommandPlan {
  const selected = request.context.selectedShapes.length
    ? request.context.selectedShapes
    : request.context.candidateShapes.length
      ? request.context.candidateShapes
    : request.context.viewportShapes.filter((shape) => shape.type === "sticky");

  if (!selected.length) {
    return { message: "No sticky notes were available to arrange.", operations: [] };
  }

  const minX = Math.min(...selected.map((shape) => shape.x));
  const minY = Math.min(...selected.map((shape) => shape.y));
  const cols = Math.ceil(Math.sqrt(selected.length));
  const operations = selected.map<BoardOperation>((shape, index) => ({
    type: "moveObject",
    objectId: shape.id,
    x: minX + (index % cols) * 190,
    y: minY + Math.floor(index / cols) * 170,
  }));

  return { message: "Arranged selected notes in a grid.", operations };
}

function resizeFrameToFitContents(request: AiCommandRequest): AiCommandPlan {
  const shapes = uniqueShapes(
    request.context.selectedShapes,
    request.context.candidateShapes,
    request.context.viewportShapes,
  );
  const frame =
    request.context.selectedShapes.find((shape) => shape.type === "frame") ??
    request.context.viewportShapes.find((shape) => shape.type === "frame") ??
    request.context.candidateShapes.find((shape) => shape.type === "frame");

  if (!frame) {
    return { message: "No frame was available to resize.", operations: [] };
  }

  const contents = shapes.filter((shape) => shape.id !== frame.id && contains(frame, shape));
  if (!contents.length) {
    return { message: "No frame contents were available to fit.", operations: [] };
  }

  const padding = 48;
  const minX = Math.min(...contents.map((shape) => shape.x));
  const minY = Math.min(...contents.map((shape) => shape.y));
  const maxX = Math.max(...contents.map((shape) => shape.x + objectWidth(shape)));
  const maxY = Math.max(...contents.map((shape) => shape.y + objectHeight(shape)));

  return {
    message: "Resized the frame to fit its contents.",
    operations: [
      { type: "moveObject", objectId: frame.id, x: minX - padding, y: minY - padding },
      {
        type: "resizeObject",
        objectId: frame.id,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
      },
    ],
  };
}

function spaceEvenly(request: AiCommandRequest): AiCommandPlan {
  const shapes = request.context.selectedShapes.length
    ? request.context.selectedShapes
    : uniqueShapes(request.context.candidateShapes, request.context.viewportShapes).filter((shape) => shape.type !== "frame");

  if (shapes.length < 2) {
    return { message: "Select at least two objects to space evenly.", operations: [] };
  }

  const sorted = [...shapes].sort((a, b) => a.x - b.x);
  const minX = Math.min(...sorted.map((shape) => shape.x));
  const maxRight = Math.max(...sorted.map((shape) => shape.x + objectWidth(shape)));
  const totalWidth = sorted.reduce((sum, shape) => sum + objectWidth(shape), 0);
  const gap = sorted.length > 1 ? Math.max(32, (maxRight - minX - totalWidth) / (sorted.length - 1)) : 0;
  let cursorX = minX;
  const averageY = sorted.reduce((sum, shape) => sum + shape.y, 0) / sorted.length;

  const operations = sorted.map<BoardOperation>((shape) => {
    const operation = {
      type: "moveObject",
      objectId: shape.id,
      x: cursorX,
      y: averageY,
    } satisfies BoardOperation;
    cursorX += objectWidth(shape) + gap;
    return operation;
  });

  return { message: "Spaced objects evenly.", operations };
}

function movePinkNotesRight(request: AiCommandRequest): AiCommandPlan {
  const candidates = [
    ...request.context.candidateShapes,
    ...request.context.viewportShapes,
    ...request.context.selectedShapes,
  ];
  const unique = new Map<string, CompactShape>();
  for (const shape of candidates) {
    if (shape.type === "sticky" && colorOf(shape).includes("pink")) {
      unique.set(shape.id, shape);
    }
  }

  const rightX = request.context.viewportBounds.x + request.context.viewportBounds.width - 240;
  const operations = [...unique.values()].map<BoardOperation>((shape, index) => ({
    type: "moveObject",
    objectId: shape.id,
    x: rightX,
    y: request.context.viewportBounds.y + 120 + index * 170,
  }));

  return { message: "Moved pink sticky notes to the right side.", operations };
}
