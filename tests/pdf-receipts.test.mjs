import assert from "node:assert/strict";
import test from "node:test";

import { horizontalReceiptBands } from "../app/lib/pdf-receipts.ts";

function pageWithReceipts(rectangles, width = 200, height = 500) {
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const [top, bottom] of rectangles) {
    for (let y = top; y <= bottom; y += 10) {
      for (let x = 20; x < width - 20; x++) {
        const offset = (y * width + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
      }
    }
  }
  return pixels;
}

test("one PDF page containing three well-separated receipts becomes three regions", () => {
  const crops = horizontalReceiptBands(pageWithReceipts([[20, 100], [185, 265], [350, 430]]), 200, 500);
  assert.equal(crops.length, 3);
  assert.ok(crops[0].y + crops[0].height < crops[1].y);
  assert.ok(crops[1].y + crops[1].height < crops[2].y);
});

test("normal line gaps inside one receipt do not split it", () => {
  const crops = horizontalReceiptBands(pageWithReceipts([[20, 180]]), 200, 500);
  assert.deepEqual(crops, [{ x: 0, y: 0, width: 1, height: 1 }]);
});
