// @ts-nocheck
import type p5 from "p5";

import BrowserCollageLayer from "./p5-layers/layer-browser-collage";
import NetomatLayer from "./p5-layers/layer-netomat";
import DataOverlayLayer from "./p5-layers/layer-data-overlay";
import TreeDiagramLayer from "./p5-layers/layer-tree-diagram";
import GlitchTypoLayer from "./p5-layers/layer-glitch-typo";
import GeoDataLayer from "./p5-layers/layer-geo-data";
import SwissPosterLayer from "./p5-layers/layer-swiss-poster";
import BlueprintLayer from "./p5-layers/layer-blueprint";
import InterlockingLayer from "./p5-layers/layer-interlocking";
import PixelMosaicLayer from "./p5-layers/layer-pixel-mosaic";
import ConcreteTextLayer from "./p5-layers/layer-concrete-text";
import ColorGridLayer from "./p5-layers/layer-color-grid";
import BitmapNumbersLayer from "./p5-layers/layer-bitmap-numbers";
import DenseLinesLayer from "./p5-layers/layer-dense-lines";
import CharMatrixLayer from "./p5-layers/layer-char-matrix";
import PixelWordsLayer from "./p5-layers/layer-pixel-words";
import CheckerFillLayer from "./p5-layers/layer-checker-fill";
import MapShapesLayer from "./p5-layers/layer-map-shapes";
import HatchingLayer from "./p5-layers/layer-hatching";
import CharBordersLayer from "./p5-layers/layer-char-borders";
import Trial3Layer from "./p5-layers/layer-trial3";
import ScatteredTextLayer from "./p5-layers/layer-scattered-text";
import ContourShapesLayer from "./p5-layers/layer-contour-shapes";
import AIDetectionLayer from "./p5-layers/layer-ai-detection";
import SentenceDrawingLayer from "./p5-layers/layer-sentence-drawing";

export interface StyleContent {
  words?: string[];
  labels?: string[];
  bigWords?: string[];
  readouts?: string[];
  dataTexts?: string[];
  paraLines?: string[];
  titles?: string[];
  entries?: string[];
  htmlLines?: string[];
  labelTexts?: string[];
}

interface LayerEntry {
  key: string;
  layer: any;
  blend: number;
  alpha: number;
}

export interface StyleInstance {
  init: () => void;
  update: () => void;
  render: (p: p5) => void;
  bg: "dark" | "light";
}

type StyleFactory = (p: p5, w: number, h: number, content?: StyleContent) => StyleInstance;

function makeMultiLayerStyle(
  p: p5,
  entries: LayerEntry[],
  bg: "dark" | "light"
): StyleInstance {
  return {
    bg,
    init() {
      for (const e of entries) e.layer.init();
    },
    update() {
      for (const e of entries) e.layer.update();
    },
    render(p: p5) {
      p.background(bg === "dark" ? 0 : 255);
      for (const e of entries) {
        const buf = e.layer.render();
        if (!buf) continue;
        p.push();
        p.blendMode(e.blend);
        p.tint(255, e.alpha);
        p.image(buf, 0, 0);
        p.pop();
      }
      p.noTint();
      p.blendMode(p.BLEND);
    },
  };
}

function makeSingleLayerStyle(
  p: p5,
  layer: any,
  bg: "dark" | "light"
): StyleInstance {
  return {
    bg,
    init() { layer.init(); },
    update() { layer.update(); },
    render(p: p5) {
      if (bg === "dark") p.background(0);
      const buf = layer.render();
      if (buf) p.image(buf, 0, 0);
    },
  };
}

// Style 0: MAIN — 12-layer composite (full), or ConcreteText (simplified)
const styleMain: StyleFactory = (p, w, h, content) => {
  const browser = new BrowserCollageLayer(w, h, p);
  const netomat = new NetomatLayer(w, h, p);
  const overlay = new DataOverlayLayer(w, h, p);
  const tree = new TreeDiagramLayer(w, h, p);
  const glitch = new GlitchTypoLayer(w, h, p);
  const geo = new GeoDataLayer(w, h, p);
  const swiss = new SwissPosterLayer(w, h, p);
  const blueprint = new BlueprintLayer(w, h, p);
  const interlock = new InterlockingLayer(w, h, p);
  const pixel = new PixelMosaicLayer(w, h, p);
  const concrete = new ConcreteTextLayer(w, h, p);
  const colorgrid = new ColorGridLayer(w, h, p);

  const entries: LayerEntry[] = [
    { key: "tree", layer: tree, blend: p.SCREEN || 4, alpha: 80 },
    { key: "blueprint", layer: blueprint, blend: p.SCREEN || 4, alpha: 60 },
    { key: "interlock", layer: interlock, blend: p.SCREEN || 4, alpha: 70 },
    { key: "browser", layer: browser, blend: p.SCREEN || 4, alpha: 100 },
    { key: "geo", layer: geo, blend: p.ADD || 2, alpha: 80 },
    { key: "glitch", layer: glitch, blend: p.SCREEN || 4, alpha: 70 },
    { key: "colorgrid", layer: colorgrid, blend: p.ADD || 2, alpha: 60 },
    { key: "pixel", layer: pixel, blend: p.ADD || 2, alpha: 50 },
    { key: "swiss", layer: swiss, blend: p.SCREEN || 4, alpha: 60 },
    { key: "netomat", layer: netomat, blend: p.ADD || 2, alpha: 80 },
    { key: "concrete", layer: concrete, blend: p.SCREEN || 4, alpha: 70 },
    { key: "overlay", layer: overlay, blend: p.MULTIPLY || 8, alpha: 160 },
  ];

  const style = makeMultiLayerStyle(p, entries, "dark");
  const origInit = style.init;
  style.init = () => {
    browser.init(10);
    netomat.init();
    overlay.init();
    tree.init();
    glitch.init();
    geo.init();
    swiss.init();
    blueprint.init();
    interlock.init();
    pixel.init();
    concrete.init();
    colorgrid.init();
  };
  return style;
};

const styleMainSimplified: StyleFactory = (p, w, h, content) => {
  return makeSingleLayerStyle(p, new ConcreteTextLayer(w, h, p), "dark");
};

// Style 1: Dense bitmap/text — 8 layers
const style1: StyleFactory = (p, w, h, content) => {
  const bitmap = new BitmapNumbersLayer(w, h, p);
  const lines = new DenseLinesLayer(w, h, p);
  const charmatrix = new CharMatrixLayer(w, h, p);
  const pixelwords = new PixelWordsLayer(w, h, p);
  const checker = new CheckerFillLayer(w, h, p);
  const mapshapes = new MapShapesLayer(w, h, p);
  const hatching = new HatchingLayer(w, h, p);
  const charborders = new CharBordersLayer(w, h, p);

  return makeMultiLayerStyle(p, [
    { key: "checker", layer: checker, blend: p.BLEND || 0, alpha: 200 },
    { key: "mapshapes", layer: mapshapes, blend: p.BLEND || 0, alpha: 180 },
    { key: "hatching", layer: hatching, blend: p.SCREEN || 4, alpha: 140 },
    { key: "lines", layer: lines, blend: p.SCREEN || 4, alpha: 160 },
    { key: "charmatrix", layer: charmatrix, blend: p.SCREEN || 4, alpha: 180 },
    { key: "charborders", layer: charborders, blend: p.SCREEN || 4, alpha: 150 },
    { key: "bitmap", layer: bitmap, blend: p.SCREEN || 4, alpha: 220 },
    { key: "pixelwords", layer: pixelwords, blend: p.SCREEN || 4, alpha: 180 },
  ], "dark");
};

const style1Simplified: StyleFactory = (p, w, h, content) => {
  const charmatrix = new CharMatrixLayer(w, h, p);
  const bitmap = new BitmapNumbersLayer(w, h, p);

  return makeMultiLayerStyle(p, [
    { key: "charmatrix", layer: charmatrix, blend: p.BLEND || 0, alpha: 220 },
    { key: "bitmap", layer: bitmap, blend: p.SCREEN || 4, alpha: 200 },
  ], "dark");
};

// Style 2: Char borders only
const style2: StyleFactory = (p, w, h) => {
  return makeSingleLayerStyle(p, new CharBordersLayer(w, h, p), "dark");
};

// Style 3: Browser + Netomat
const style3: StyleFactory = (p, w, h, content) => {
  const browser = new BrowserCollageLayer(w, h, p);
  const netomat = new NetomatLayer(w, h, p);

  const style = makeMultiLayerStyle(p, [
    { key: "browser", layer: browser, blend: p.BLEND || 0, alpha: 255 },
    { key: "netomat", layer: netomat, blend: p.ADD || 2, alpha: 160 },
  ], "dark");
  const origInit = style.init;
  style.init = () => {
    browser.init(10);
    netomat.init();
  };
  return style;
};

const style3Simplified: StyleFactory = (p, w, h, content) => {
  return makeSingleLayerStyle(p, new NetomatLayer(w, h, p), "dark");
};

// Style 4: Swiss type + bitmap hybrid (Trial3)
const style4: StyleFactory = (p, w, h, content) => {
  return makeSingleLayerStyle(p, new Trial3Layer(w, h, p, content?.labels), "dark");
};

// Style 5: Geo data HUD
const style5: StyleFactory = (p, w, h, content) => {
  return makeSingleLayerStyle(p, new GeoDataLayer(w, h, p), "dark");
};

// Style 6: Scattered text (white bg)
const style6: StyleFactory = (p, w, h, content) => {
  return makeSingleLayerStyle(p, new ScatteredTextLayer(w, h, p, content?.words), "light");
};

// Style 7: Color grid Mondrian
const style7: StyleFactory = (p, w, h) => {
  return makeSingleLayerStyle(p, new ColorGridLayer(w, h, p), "dark");
};

// Style 8: Contour shapes (white bg)
const style8: StyleFactory = (p, w, h, content) => {
  return makeSingleLayerStyle(p, new ContourShapesLayer(w, h, p), "light");
};

// Style 9: AI detection HUD
const style9: StyleFactory = (p, w, h, content) => {
  return makeSingleLayerStyle(p, new AIDetectionLayer(w, h, p, content?.labels, content?.dataTexts), "dark");
};

// Style 10: Sentence drawing (white bg)
const style10: StyleFactory = (p, w, h, content) => {
  return makeSingleLayerStyle(p, new SentenceDrawingLayer(w, h, p, content?.labelTexts), "light");
};

export const STYLE_FACTORIES: StyleFactory[] = [
  styleMain, style1, style2, style3, style4,
  style5, style6, style7, style8, style9, style10,
];

const SIMPLIFIED_OVERRIDES: Record<number, StyleFactory> = {
  0: styleMainSimplified,
  1: style1Simplified,
  3: style3Simplified,
};

export function createStyle(
  styleId: number,
  p: p5,
  w: number,
  h: number,
  content?: StyleContent,
  simplified?: boolean
): StyleInstance {
  const idx = styleId % STYLE_FACTORIES.length;
  if (simplified && idx in SIMPLIFIED_OVERRIDES) {
    return SIMPLIFIED_OVERRIDES[idx](p, w, h, content);
  }
  return STYLE_FACTORIES[idx](p, w, h, content);
}
