import { blake3seed } from "../../shared/crypto";

(() => {
  let sessionSeed: number;

  crypto.getRandomValues(new Uint32Array(1)).forEach((v) => {
    sessionSeed = v;
  });

  const SYSTEM_FONTS = [
    "Arial",
    "Arial Black",
    "Calibri",
    "Cambria",
    "Candara",
    "Century Gothic",
    "Comic Sans MS",
    "Consolas",
    "Constantia",
    "Corbel",
    "Courier New",
    "Georgia",
    "Gulim",
    "Impact",
    "Lucida Console",
    "Lucida Sans Unicode",
    "Malgun Gothic",
    "Microsoft Sans Serif",
    "Palatino Linotype",
    "Segoe UI",
    "Sylfaen",
    "Tahoma",
    "Times New Roman",
    "Trebuchet MS",
    "Verdana",
    "Webdings",
    "Wingdings",
  ];

  // Canvas text noise
  const origMT = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function (text: string) {
    const result = origMT.call(this, text);
    if (!sessionSeed) sessionSeed = Date.now();
    const seed = blake3seed(String(sessionSeed) + text);
    const rng = new SeededRNG(seed);
    const delta = rng.float(-0.02, 0.02);

    return {
      ...result,
      width: result.width + delta,
      actualBoundingBoxLeft:
        (result as any).actualBoundingBoxLeft + rng.float(-0.5, 0.5),
      actualBoundingBoxRight:
        (result as any).actualBoundingBoxRight + rng.float(-0.5, 0.5),
      actualBoundingBoxAscent:
        (result as any).actualBoundingBoxAscent + rng.float(-0.3, 0.3),
      actualBoundingBoxDescent:
        (result as any).actualBoundingBoxDescent + rng.float(-0.3, 0.3),
      fontBoundingBoxAscent:
        (result as any).fontBoundingBoxAscent + rng.float(-0.3, 0.3),
      fontBoundingBoxDescent:
        (result as any).fontBoundingBoxDescent + rng.float(-0.3, 0.3),
    };
  };

  // FontFaceSet enumeration
  if (document.fonts && FontFaceSet) {
    const isSystem = (font: string) => {
      const family = font
        .replace(/['"]/g, "")
        .replace(/\s*[0-9]+.*$/, "")
        .trim();
      return SYSTEM_FONTS.some((f) => f.toLowerCase() === family.toLowerCase());
    };

    const origCheck = FontFaceSet.prototype.check;
    FontFaceSet.prototype.check = function (font: string, text?: string) {
      if (isSystem(font)) return origCheck.call(this, font, text);
      return false;
    };

    FontFaceSet.prototype.forEach = function () {};
    FontFaceSet.prototype.values = function (): IterableIterator<FontFace> {
      return [][Symbol.iterator]();
    };
    FontFaceSet.prototype.keys = function (): IterableIterator<FontFace> {
      return [][Symbol.iterator]();
    };
    FontFaceSet.prototype.entries = function (): IterableIterator<
      [FontFace, FontFace]
    > {
      return [][Symbol.iterator]();
    };
    FontFaceSet.prototype[Symbol.iterator] =
      function (): IterableIterator<FontFace> {
        return [][Symbol.iterator]();
      };
    Object.defineProperty(FontFaceSet.prototype, "size", { get: () => 0 });
    (FontFaceSet.prototype as any).has = function () {
      return false;
    };
  }
})();

class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 0xffffffff;
  }
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}
