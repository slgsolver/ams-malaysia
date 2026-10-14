export type Crop = { x: number; y: number; width: number; height: number };
export type PdfRegion = { page: number; crop: Crop; text: string; preview: string; pdf: Blob };

const fullPageCrop: Crop = { x: 0, y: 0, width: 1, height: 1 };

// The projection finds broad whitespace between separate slips without treating
// ordinary line spacing inside a receipt as a new document.
export function horizontalReceiptBands(pixels: Uint8ClampedArray, width: number, height: number): Crop[] {
  if (!width || !height || pixels.length < width * height * 4) return [];
  const active: number[] = [];
  const threshold = Math.max(3, Math.floor(width * 0.004));
  for (let y = 0; y < height; y++) {
    let dark = 0;
    for (let x = 0; x < width; x += 2) {
      const offset = (y * width + x) * 4;
      if (pixels[offset] < 218 && pixels[offset + 1] < 218 && pixels[offset + 2] < 218) dark++;
    }
    if (dark >= threshold) active.push(y);
  }
  if (!active.length) return [fullPageCrop];
  const gap = Math.max(38, Math.round(height * 0.035));
  const bands: [number, number][] = [];
  let start = active[0];
  let end = active[0];
  for (const row of active.slice(1)) {
    if (row - end > gap) {
      bands.push([start, end]);
      start = row;
    }
    end = row;
  }
  bands.push([start, end]);
  const usable = bands.filter(([top, bottom]) => bottom - top >= Math.max(24, height * 0.02));
  if (usable.length < 2) return [fullPageCrop];
  return usable.map(([top, bottom]) => {
    const padding = Math.min(18, Math.round(height * 0.012));
    const y = Math.max(0, top - padding);
    const bottomEdge = Math.min(height, bottom + padding);
    return { x: 0, y: y / height, width: 1, height: (bottomEdge - y) / height };
  });
}

// Side-by-side scans need a separate projection. The larger gutter and
// minimum-width rules avoid treating normal amount columns as separate slips.
export function verticalReceiptBands(pixels: Uint8ClampedArray, width: number, height: number): Crop[] {
  if (!width || !height || pixels.length < width * height * 4) return [];
  const active: number[] = [];
  const threshold = Math.max(3, Math.floor(height * 0.004));
  for (let x = 0; x < width; x++) {
    let dark = 0;
    for (let y = 0; y < height; y++) {
      const offset = (y * width + x) * 4;
      if (pixels[offset] < 218 && pixels[offset + 1] < 218 && pixels[offset + 2] < 218) dark++;
    }
    if (dark >= threshold) active.push(x);
  }
  if (!active.length) return [fullPageCrop];
  const gap = Math.max(54, Math.round(width * 0.07));
  const bands: [number, number][] = [];
  let start = active[0];
  let end = active[0];
  for (const column of active.slice(1)) {
    if (column - end > gap) {
      bands.push([start, end]);
      start = column;
    }
    end = column;
  }
  bands.push([start, end]);
  const minimumWidth = Math.max(48, width * 0.18);
  const usable = bands.filter(([left, right]) => right - left >= minimumWidth);
  if (usable.length < 2 || usable.length > 4) return [fullPageCrop];
  return usable.map(([left, right]) => {
    const padding = Math.min(18, Math.round(width * 0.012));
    const x = Math.max(0, left - padding);
    const rightEdge = Math.min(width, right + padding);
    return { x: x / width, y: 0, width: (rightEdge - x) / width, height: 1 };
  });
}

function cropPixels(pixels: Uint8ClampedArray, width: number, height: number, crop: Crop) {
  const left = Math.max(0, Math.floor(crop.x * width));
  const top = Math.max(0, Math.floor(crop.y * height));
  const cropWidth = Math.max(1, Math.min(width - left, Math.ceil(crop.width * width)));
  const cropHeight = Math.max(1, Math.min(height - top, Math.ceil(crop.height * height)));
  const output = new Uint8ClampedArray(cropWidth * cropHeight * 4);
  for (let y = 0; y < cropHeight; y++) {
    const sourceStart = ((top + y) * width + left) * 4;
    output.set(pixels.subarray(sourceStart, sourceStart + cropWidth * 4), y * cropWidth * 4);
  }
  return { pixels: output, width: cropWidth, height: cropHeight };
}

export function receiptRegionsFromPixels(pixels: Uint8ClampedArray, width: number, height: number): Crop[] {
  const rows = horizontalReceiptBands(pixels, width, height);
  if (rows.length > 1) {
    return rows.flatMap((row) => {
      const section = cropPixels(pixels, width, height, row);
      const columns = verticalReceiptBands(section.pixels, section.width, section.height);
      if (columns.length < 2) return [row];
      return columns.map((column) => ({
        x: row.x + column.x * row.width,
        y: row.y,
        width: column.width * row.width,
        height: row.height,
      }));
    });
  }
  return verticalReceiptBands(pixels, width, height);
}

async function renderPage(file: File, pageNumber: number) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdfDocument = await task.promise;
    if (pdfDocument.numPages > 30) throw new Error("This PDF has over 30 pages. Please upload a smaller batch.");
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("This browser cannot render PDF pages.");
    await page.render({ canvasContext: context, canvas, viewport }).promise;
    return { canvas, pages: pdfDocument.numPages };
  } finally {
    await task.destroy();
  }
}

export async function countPdfPages(file: File): Promise<number> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const document = await task.promise;
    if (document.numPages > 30) throw new Error("This PDF has over 30 pages. Please upload a smaller batch.");
    return document.numPages;
  } finally {
    await task.destroy();
  }
}

export async function autoRegions(file: File, pageNumber: number): Promise<Crop[]> {
  const { canvas } = await renderPage(file, pageNumber);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot inspect PDF pages.");
  return receiptRegionsFromPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
}

export async function readPdfRegion(file: File, pageNumber: number, crop: Crop): Promise<PdfRegion> {
  const { canvas } = await renderPage(file, pageNumber);
  const x = Math.max(0, Math.round(crop.x * canvas.width));
  const y = Math.max(0, Math.round(crop.y * canvas.height));
  const width = Math.max(1, Math.min(canvas.width - x, Math.round(crop.width * canvas.width)));
  const height = Math.max(1, Math.min(canvas.height - y, Math.round(crop.height * canvas.height)));
  const cut = document.createElement("canvas");
  cut.width = width;
  cut.height = height;
  const context = cut.getContext("2d");
  if (!context) throw new Error("This browser cannot cut PDF pages.");
  context.fillStyle = "white";
  context.fillRect(0, 0, width, height);
  context.drawImage(canvas, x, y, width, height, 0, 0, width, height);
  const preview = cut.toDataURL("image/jpeg", 0.9);
  let text = "";
  try {
    const Tesseract = await import("tesseract.js");
    text = (await Tesseract.recognize(cut, "eng")).data.text;
  } catch {
    // A readable cropped PDF is still available for manual entry.
  }
  const { PDFDocument } = await import("pdf-lib");
  const pdfDocument = await PDFDocument.create();
  const image = await pdfDocument.embedJpg(preview);
  const page = pdfDocument.addPage([width / 1.8, height / 1.8]);
  page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  const pdf = new Blob([Uint8Array.from(await pdfDocument.save())], { type: "application/pdf" });
  return { page: pageNumber, crop, text, preview, pdf };
}
