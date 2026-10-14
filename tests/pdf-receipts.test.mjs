import assert from "node:assert/strict";
import test from "node:test";

import { horizontalReceiptBands, receiptRegionsFromPixels, verticalReceiptBands } from "../app/lib/pdf-receipts.ts";
import { classifyReceiptText } from "../app/lib/receipt-classification.ts";

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

function pageWithReceiptBoxes(rectangles, width = 600, height = 500) {
  const pixels = new Uint8ClampedArray(width * height * 4).fill(255);
  for (const [left, top, right, bottom] of rectangles) {
    for (let y = top; y <= bottom; y += 10) {
      for (let x = left; x <= right; x++) {
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

test("side-by-side receipts become separate regions", () => {
  const pixels = pageWithReceiptBoxes([[25, 25, 250, 450], [350, 25, 575, 450]]);
  const crops = verticalReceiptBands(pixels, 600, 500);
  assert.equal(crops.length, 2);
  assert.ok(crops[0].x + crops[0].width < crops[1].x);
});

test("a two-by-two scan becomes four receipt regions", () => {
  const pixels = pageWithReceiptBoxes([
    [25, 20, 250, 190],
    [350, 20, 575, 190],
    [25, 310, 250, 480],
    [350, 310, 575, 480],
  ]);
  const crops = receiptRegionsFromPixels(pixels, 600, 500);
  assert.equal(crops.length, 4);
  assert.ok(crops.every((crop) => crop.width < 0.5 && crop.height < 0.5));
});

test("Malaysian merchant keywords classify receipt categories", () => {
  assert.equal(classifyReceiptText("PETRONAS RON95 TOTAL RM 80.00").category, "Petrol");
  assert.equal(classifyReceiptText("TOUCH N GO PARKING RM 20.00").category, "Toll Fee");
  assert.equal(classifyReceiptText("RESTORAN MAJU JUMLAH RM 50.00").category, "Food & Beverage");
  assert.equal(classifyReceiptText("MAXIS POSTPAID RM 128.00").category, "Mobile");
});
