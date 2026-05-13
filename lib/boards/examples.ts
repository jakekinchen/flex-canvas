import type { BoardOperation } from "@/lib/ai/schema";

export type ExampleBoardTemplate = {
  description: string;
  id: "swot" | "research" | "retro";
  name: string;
};

export const exampleBoardTemplates: ExampleBoardTemplate[] = [
  {
    description: "Four-quadrant strategy board with labeled sections and starting notes.",
    id: "swot",
    name: "SWOT Planning",
  },
  {
    description: "Interview synthesis board for observations, pain points, and follow-ups.",
    id: "research",
    name: "User Research",
  },
  {
    description: "Workshop retro with wins, friction, and action-item columns.",
    id: "retro",
    name: "Team Retrospective",
  },
];

export function getExampleBoardTemplate(templateId: FormDataEntryValue | null) {
  if (typeof templateId !== "string") return null;
  return exampleBoardTemplates.find((template) => template.id === templateId) ?? null;
}

export function buildExampleBoardOperations(templateId: ExampleBoardTemplate["id"]): BoardOperation[] {
  switch (templateId) {
    case "swot":
      return buildSwotTemplate();
    case "research":
      return buildResearchTemplate();
    case "retro":
      return buildRetroTemplate();
  }
}

function buildSwotTemplate(): BoardOperation[] {
  const x = 120;
  const y = 120;
  const quadrants = [
    ["Strengths", "What is already working?", "green"],
    ["Weaknesses", "Where are we exposed?", "pink"],
    ["Opportunities", "What can we unlock?", "blue"],
    ["Threats", "What could slow us down?", "orange"],
  ] as const;

  return [
    { type: "createFrame", title: "SWOT Planning", x, y, width: 860, height: 640 },
    { type: "createText", text: "SWOT Planning", x: x + 36, y: y + 30, fontSize: 32 },
    ...quadrants.flatMap<BoardOperation>(([title, prompt, color], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const sectionX = x + 44 + col * 390;
      const sectionY = y + 100 + row * 240;
      return [
        { type: "createShape", shapeType: "rectangle", x: sectionX, y: sectionY, width: 350, height: 200, color: "blue" },
        { type: "createText", text: title, x: sectionX + 20, y: sectionY + 18, fontSize: 25 },
        { type: "createStickyNote", text: prompt, x: sectionX + 24, y: sectionY + 76, color },
      ];
    }),
  ];
}

function buildResearchTemplate(): BoardOperation[] {
  const x = 120;
  const y = 120;
  return [
    { type: "createFrame", title: "User Research", x, y, width: 980, height: 560 },
    { type: "createText", text: "User Research Synthesis", x: x + 36, y: y + 30, fontSize: 30 },
    { type: "createShape", shapeType: "rectangle", x: x + 42, y: y + 96, width: 280, height: 390, color: "blue" },
    { type: "createShape", shapeType: "rectangle", x: x + 350, y: y + 96, width: 280, height: 390, color: "purple" },
    { type: "createShape", shapeType: "rectangle", x: x + 658, y: y + 96, width: 280, height: 390, color: "green" },
    { type: "createText", text: "Observations", x: x + 66, y: y + 122, fontSize: 24 },
    { type: "createText", text: "Pain Points", x: x + 374, y: y + 122, fontSize: 24 },
    { type: "createText", text: "Follow-ups", x: x + 682, y: y + 122, fontSize: 24 },
    { type: "createStickyNote", text: "Quote or behavior", x: x + 66, y: y + 184, color: "yellow" },
    { type: "createStickyNote", text: "Repeated friction", x: x + 374, y: y + 184, color: "pink" },
    { type: "createStickyNote", text: "Next interview question", x: x + 682, y: y + 184, color: "green" },
  ];
}

function buildRetroTemplate(): BoardOperation[] {
  const x = 120;
  const y = 120;
  const columns = [
    ["What Went Well", "Wins and strong habits", "green"],
    ["What Didn't", "Friction and misses", "pink"],
    ["Action Items", "Owner and next step", "yellow"],
  ] as const;

  return [
    { type: "createFrame", title: "Team Retrospective", x, y, width: 980, height: 560 },
    ...columns.flatMap<BoardOperation>(([title, prompt, color], index) => {
      const columnX = x + 42 + index * 306;
      return [
        { type: "createShape", shapeType: "rectangle", x: columnX, y: y + 80, width: 276, height: 420, color: "blue" },
        { type: "createText", text: title, x: columnX + 18, y: y + 106, fontSize: 23 },
        { type: "createStickyNote", text: prompt, x: columnX + 28, y: y + 178, color },
      ];
    }),
  ];
}
