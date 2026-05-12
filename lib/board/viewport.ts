import type { BoardPoint, ViewportBounds } from "@/lib/board/types";

export type ViewportTransform = {
  scale: number;
  stageX: number;
  stageY: number;
};

export function clampScale(scale: number) {
  return Math.min(3, Math.max(0.2, scale));
}

export function screenToWorld(point: BoardPoint, viewport: ViewportTransform): BoardPoint {
  return {
    x: (point.x - viewport.stageX) / viewport.scale,
    y: (point.y - viewport.stageY) / viewport.scale,
  };
}

export function worldToScreen(point: BoardPoint, viewport: ViewportTransform): BoardPoint {
  return {
    x: point.x * viewport.scale + viewport.stageX,
    y: point.y * viewport.scale + viewport.stageY,
  };
}

export function getViewportBounds(
  viewport: ViewportTransform,
  size: { width: number; height: number },
): ViewportBounds {
  const topLeft = screenToWorld({ x: 0, y: 0 }, viewport);
  const bottomRight = screenToWorld({ x: size.width, y: size.height }, viewport);

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

export function zoomTowardPoint(
  viewport: ViewportTransform,
  pointer: BoardPoint,
  deltaY: number,
): ViewportTransform {
  const oldScale = viewport.scale;
  const nextScale = clampScale(deltaY > 0 ? oldScale * 0.92 : oldScale * 1.08);
  const worldPoint = screenToWorld(pointer, viewport);

  return {
    scale: nextScale,
    stageX: pointer.x - worldPoint.x * nextScale,
    stageY: pointer.y - worldPoint.y * nextScale,
  };
}
