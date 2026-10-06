import type { DbGame } from "./gameTypes";

export type PipelineGame = DbGame & { id: number };
export const PIPELINE_LIMIT = 15;
export const pipelineSlots = [
  { x: 50, y: 47, scale: 1.3 },
  { x: 33, y: 18, scale: 1 },
  { x: 65, y: 18, scale: 0.98 },
  { x: 16, y: 37, scale: 0.96 },
  { x: 83, y: 39, scale: 0.94 },
  { x: 25, y: 65, scale: 0.92 },
  { x: 47, y: 79, scale: 0.9 },
  { x: 73, y: 70, scale: 0.88 },
  { x: 11, y: 83, scale: 0.86 },
  { x: 89, y: 84, scale: 0.84 },
  { x: 10, y: 13, scale: 0.82 },
  { x: 89, y: 13, scale: 0.8 },
  { x: 10, y: 61, scale: 0.78 },
  { x: 89, y: 61, scale: 0.76 },
  { x: 51, y: 10, scale: 0.74 },
];

export function isPipelineIds(value: unknown): value is number[] {
  return Array.isArray(value) && value.length <= PIPELINE_LIMIT &&
    value.every((id) => Number.isSafeInteger(id) && id > 0) &&
    new Set(value).size === value.length;
}
