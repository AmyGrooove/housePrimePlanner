import type { LengthUnit } from "../model/types";

export const lengthUnits: Array<{ value: LengthUnit; label: string; multiplier: number; step: string }> = [
  { value: "mm", label: "мм", multiplier: 1, step: "1" },
  { value: "cm", label: "см", multiplier: 10, step: "0.1" },
  { value: "m", label: "м", multiplier: 1000, step: "0.01" },
];

export function unitConfig(unit: LengthUnit) {
  return lengthUnits.find((item) => item.value === unit) ?? lengthUnits[0];
}

export function formatLength(valueMm: number | undefined, unit: LengthUnit) {
  if (!valueMm) {
    return "";
  }

  const value = valueMm / unitConfig(unit).multiplier;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function parseLength(value: string, unit: LengthUnit) {
  const parsed = Number(value.replace(",", "."));

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed * unitConfig(unit).multiplier);
}
