const customCanvasEngineFlagName = "NEXT_PUBLIC_CUSTOM_CANVAS_ENGINE";
const disabledValues = new Set(["0", "false", "off", "disabled", "legacy", "tldraw"]);

export type CustomCanvasEngineFlag = {
  enabled: boolean;
  name: typeof customCanvasEngineFlagName;
  value: string;
};

export function getCustomCanvasEngineFlag(): CustomCanvasEngineFlag {
  const rawValue = process.env.NEXT_PUBLIC_CUSTOM_CANVAS_ENGINE?.trim().toLowerCase();
  return {
    enabled: !rawValue || !disabledValues.has(rawValue),
    name: customCanvasEngineFlagName,
    value: rawValue || "true",
  };
}
