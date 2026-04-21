// PDF storybook + coloring-book helpers (client-side only).
import jsPDF from "jspdf";

type Panel = {
  scene: string;
  caption: string;
  dialogue?: { speaker: string; text: string };
  imageUrl: string;
};

type Comic = { title: string; panels: Panel[] };

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function imgToDataUrl(src: string): Promise<{ dataUrl: string; w: number; h: number }> {
  const img = await loadImg(src);
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext("2d")!.drawImage(img, 0, 0);
  return { dataUrl: c.toDataURL("image/jpeg", 0.85), w: c.width, h: c.height };
}

export async function downloadStorybookPDF(comic: Comic) {
  // A4 portrait, mm.
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Cover
  doc.setFillColor(255, 248, 236);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(26, 26, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(comic.title, pageW / 2, 40, { align: "center", maxWidth: pageW - 30 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("A Bible Buddies storybook", pageW / 2, 55, { align: "center" });

  // Cover art = first panel
  try {
    const first = await imgToDataUrl(comic.panels[0].imageUrl);
    const size = pageW - 40;
    doc.addImage(first.dataUrl, "JPEG", 20, 70, size, size);
  } catch {}

  // One panel per page
  for (let i = 0; i < comic.panels.length; i++) {
    const p = comic.panels[i];
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, "F");

    // Page number / panel header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text(`Panel ${i + 1} of ${comic.panels.length}`, pageW / 2, 15, { align: "center" });

    // Image
    try {
      const im = await imgToDataUrl(p.imageUrl);
      const imgSize = pageW - 30;
      doc.addImage(im.dataUrl, "JPEG", 15, 22, imgSize, imgSize);
    } catch {}

    // Caption box
    const captionY = 22 + (pageW - 30) + 10;
    doc.setTextColor(26, 26, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    const lines = doc.splitTextToSize(p.caption, pageW - 30);
    doc.text(lines, 15, captionY);

    if (p.dialogue) {
      const dY = captionY + lines.length * 6 + 6;
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 140);
      const dl = doc.splitTextToSize(`${p.dialogue.speaker}: "${p.dialogue.text}"`, pageW - 30);
      doc.text(dl, 15, dY);
    }
  }

  doc.save(`${comic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "comic"}.pdf`);
}

/** Convert one image to a printable B&W line-art version using canvas filters. */
async function toLineArt(src: string): Promise<string> {
  const img = await loadImg(src);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Grayscale
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    gray[j] = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) | 0;
  }

  // Sobel edge detection
  const out = new Uint8ClampedArray(px.length);
  const idx = (x: number, y: number) => y * w + x;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[idx(x - 1, y - 1)] - 2 * gray[idx(x - 1, y)] - gray[idx(x - 1, y + 1)] +
        gray[idx(x + 1, y - 1)] + 2 * gray[idx(x + 1, y)] + gray[idx(x + 1, y + 1)];
      const gy =
        -gray[idx(x - 1, y - 1)] - 2 * gray[idx(x, y - 1)] - gray[idx(x + 1, y - 1)] +
        gray[idx(x - 1, y + 1)] + 2 * gray[idx(x, y + 1)] + gray[idx(x + 1, y + 1)];
      const mag = Math.min(255, Math.hypot(gx, gy));
      // Invert + threshold so lines are dark on white.
      const v = mag > 40 ? 0 : 255;
      const o = (y * w + x) * 4;
      out[o] = out[o + 1] = out[o + 2] = v;
      out[o + 3] = 255;
    }
  }
  // Fill borders white
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) {
      out[i] = out[i + 1] = out[i + 2] = 255;
      out[i + 3] = 255;
    }
  }
  ctx.putImageData(new ImageData(out, w, h), 0, 0);
  return c.toDataURL("image/png");
}

export async function downloadColoringBookPDF(comic: Comic) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Cover
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Color it in!", pageW / 2, 40, { align: "center" });
  doc.setFontSize(18);
  doc.text(comic.title, pageW / 2, 55, { align: "center", maxWidth: pageW - 30 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Print, grab your crayons, and bring the story to life ✏️🖍️", pageW / 2, 70, {
    align: "center",
  });

  for (let i = 0; i < comic.panels.length; i++) {
    const p = comic.panels[i];
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text(`Page ${i + 1}`, pageW / 2, 15, { align: "center" });

    try {
      const lineArt = await toLineArt(p.imageUrl);
      const size = pageW - 30;
      doc.addImage(lineArt, "PNG", 15, 22, size, size);
    } catch {}

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(13);
    const cy = 22 + (pageW - 30) + 10;
    const lines = doc.splitTextToSize(p.caption, pageW - 30);
    doc.text(lines, pageW / 2, cy, { align: "center" });
  }

  doc.save(
    `${comic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "comic"}-coloring-book.pdf`,
  );
}
