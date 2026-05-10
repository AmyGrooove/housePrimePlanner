const MILLIMETERS_IN_PIXEL = 10

const convertMillimetersToPixels = (millimeters: number): number => millimeters / MILLIMETERS_IN_PIXEL

const convertPixelsToMillimeters = (pixels: number): number => Math.round(pixels * MILLIMETERS_IN_PIXEL)

export { convertMillimetersToPixels, convertPixelsToMillimeters }
