declare const __brand: unique symbol;

type Brand<T, TBrand extends string> = T & { [__brand]: TBrand };

export type Millimeters = Brand<number, "Millimeters">;
export type SquareMillimeters = Brand<number, "SquareMillimeters">;
export type Coordinate = Brand<number, "Coordinate">;
export type Percentage = Brand<number, "Percentage">;

export const millimeters = (value: number): Millimeters => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid millimeters value: ${value}`);
  }
  return value as Millimeters;
};

export const squareMillimeters = (value: number): SquareMillimeters => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid square millimeters value: ${value}`);
  }
  return value as SquareMillimeters;
};

export const coordinate = (value: number): Coordinate => {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid coordinate value: ${value}`);
  }
  return value as Coordinate;
};

export const percentage = (value: number): Percentage => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`Invalid percentage value: ${value}. Must be between 0 and 1`);
  }
  return value as Percentage;
};

export const unsafeMm = (value: number): Millimeters => value as Millimeters;
export const unsafeSqMm = (value: number): SquareMillimeters => value as SquareMillimeters;
export const unsafeCoord = (value: number): Coordinate => value as Coordinate;
export const unsafePercent = (value: number): Percentage => value as Percentage;
