// @ts-nocheck
import type p5 from "p5";

// Layer: Scattered Text — floating words, phrases, symbols, bars on white
// Stream-of-consciousness poetry with decorative elements

class ScatteredTextLayer {
  w: number;
  h: number;
  p: p5;
  buf: p5.Graphics | null;
  elements: any[];
  t: number;
  words: string[];

  constructor(w: number, h: number, p: p5, words?: string[]) {
    this.w = w;
    this.h = h;
    this.p = p;
    this.buf = null;
    this.elements = [];
    this.t = 0;
    this.words = words ?? [
      "groceries", "internship", "diploma", "grow", "claustrophobic",
      "kittens", "world of dreams", "4tune teller", "mismatched",
      "impossible", "pink flowers", "blue flowers", "rats attack",
      "rain", "green", "lifeless", "soaring beeline",
      "stained glass", "midwest fields", "tea cups",
      "i am here", "and there is nothing to say",
      "what we require is silence", "let them leave at any moment",
      "but what silence requires is", "that i go on talking",
      "who wish to get somewhere", "if among you are those",
      "purple and purple ways black voids within",
      "disassociated the knowing of land staying",
      "me here within in front lines of vision",
      "slow", "fast", "lush", "driven",
      "a vast window", "shafts of light", "landed in a ch",
      "saw grasses pa", "barre",
      "I went thrift store shopping.",
      "a place like grandmas and grandpas",
      "old western town but up in the sky",
      "or on a very large hill at least.",
      "I missed the bus, felt like when I miss the trains in New York",
      "weaving tunnels with no end.",
      "The others were on the hill and waiting",
      "We are waiting for the Angel",
      "Openmouthed frozen they point where it is",
      "beaming, hand holding recognition hi hello",
      "you swept by eye contact for a second then taken",
      "A station on the way to somewhere",
      "I felt very alone. I dont",
      "pressed into the grass by your invisible form",
      "wwwindo", "drawers",
      "yellow blue pink", "other time.",
      "possible.", "9",
    ];
  }

  init() {
    this.buf = this.p.createGraphics(this.w, this.h);
    this.buf.pixelDensity(1);

    let w = this.w, h = this.h;
    let words = this.words;

    // Scatter single words and short phrases
    for (let i = 0; i < 55; i++) {
      let txt = words[this.p.floor(this.p.random(words.length))];
      let sz = txt.length > 30 ? this.p.random(6, 9) : (this.p.random() < 0.2 ? this.p.random(12, 20) : this.p.random(8, 12));
      this.elements.push({
        type: "word",
        x: this.p.random(w * 0.03, w * 0.92),
        y: this.p.random(h * 0.02, h * 0.96),
        text: txt, size: sz,
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // Dense paragraph blocks (lower half, like reference 1)
    let paraLines = [
      "these endless      &&&",
      "by the time I got there    broken",
      "the tour I was supposed to go on had already began.",
      "I couldnt find my people. I felt very alone.",
      "Two crowds rushing in different directions.",
      "great concentric halls and all the bodies rushing past.",
      "Rooms along open on new rooms.",
      "A green endless bathroom. A great hall. A corridor opened upon",
      "seven mezzanines heart of the place.",
      "and waiting there for words of wisdom never came I walked away sa",
      "walls of the space again thought I had been outside your garden w",
      "side of the world I felt i could see from above unreachable how f",
    ];
    let paraY = h * 0.65;
    for (let i = 0; i < paraLines.length; i++) {
      this.elements.push({
        type: "word",
        x: this.p.random() < 0.5 ? w * 0.15 : w * 0.35,
        y: paraY + i * 13,
        text: paraLines[i],
        size: 8,
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- Symbols scattered ---
    let symbols = ["&&", "&&&", "&&&&", "**", "****", '""', '"""', "°", "··", "•", "***"];
    for (let i = 0; i < 20; i++) {
      this.elements.push({
        type: "word",
        x: this.p.random(w * 0.05, w * 0.95),
        y: this.p.random(h * 0.03, h * 0.95),
        text: symbols[this.p.floor(this.p.random(symbols.length))],
        size: this.p.random(8, 14),
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- Decorative symbols (∆, Σ, §, ¶, «, », ∞) ---
    let deco = [
      "∆∆ ····· °", "Σ °", "§", "¶", "«", "»",
      "∞ ∆∆∆", "+++∆∆∆∆", "∆ .... ]]", "/-",
      "∞∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆",
      "∆∆∆∆∆∆∆∆∆∆∆∆∆∆∆",
      "¶__ ]]]]]]]]]]]]«",
      "∞[ ___ Σ ° ___ ]",
      "« ¶__ ]«« _ )",
      "((( ____ ∆ .... (((",
      "° ∆∆ ∞[",
      "||-------° ¶¶",
      "______ ∞∞∞∞∞∞∞ «",
    ];
    for (let i = 0; i < 18; i++) {
      this.elements.push({
        type: "word",
        x: this.p.random(w * 0.03, w * 0.9),
        y: this.p.random(h * 0.05, h * 0.95),
        text: deco[this.p.floor(this.p.random(deco.length))],
        size: this.p.random(9, 13),
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- Thick black bars ---
    for (let i = 0; i < 8; i++) {
      let bw = this.p.random(60, 350);
      let bh = this.p.random() < 0.5 ? this.p.random(3, 8) : this.p.random(10, 25);
      this.elements.push({
        type: "bar",
        x: this.p.random(w * 0.02, w * 0.7),
        y: this.p.random(h * 0.05, h * 0.92),
        w: bw, h: bh,
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- Thin horizontal lines ---
    for (let i = 0; i < 12; i++) {
      this.elements.push({
        type: "bar",
        x: this.p.random(0, w * 0.3),
        y: this.p.random(h * 0.05, h * 0.95),
        w: this.p.random(80, w * 0.8),
        h: this.p.random(0.5, 2),
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- Dashed lines ---
    for (let i = 0; i < 8; i++) {
      this.elements.push({
        type: "dashed",
        x: this.p.random(w * 0.02, w * 0.4),
        y: this.p.random(h * 0.05, h * 0.93),
        len: this.p.random(60, w * 0.6),
        dashW: this.p.random(3, 12),
        gap: this.p.random(2, 5),
        lineH: this.p.random(1, 2.5),
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- Dot patterns (●●●●●●) ---
    for (let i = 0; i < 6; i++) {
      let numDots = this.p.floor(this.p.random(4, 12));
      let dotStr = "";
      for (let d = 0; d < numDots; d++) dotStr += "●";
      this.elements.push({
        type: "word",
        x: this.p.random(w * 0.03, w * 0.8),
        y: this.p.random(h * 0.1, h * 0.9),
        text: dotStr,
        size: this.p.random(8, 14),
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- Repeating character lines (▐▐▐▐▐, ≡≡≡≡, ||||||) ---
    let charLines = [
      "▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐▐",
      "||||||||||",
      "≡≡≡≡≡≡≡≡≡≡≡≡≡≡≡",
      "∞∞∞∞∞∞∞∞∞∞∞∞",
      "««««« _ «) ___---",
      "////////////////",
      "¶__ ]]]]]]]]]]]]]«",
      "_________________________",
      "°°°°° ___---___ooooo",
    ];
    for (let i = 0; i < 7; i++) {
      this.elements.push({
        type: "word",
        x: this.p.random(w * 0.03, w * 0.5),
        y: this.p.random(h * 0.1, h * 0.9),
        text: charLines[this.p.floor(this.p.random(charLines.length))],
        size: this.p.random(9, 12),
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- Small filled squares (accent marks) ---
    for (let i = 0; i < 8; i++) {
      this.elements.push({
        type: "square",
        x: this.p.random(w * 0.03, w * 0.95),
        y: this.p.random(h * 0.03, h * 0.95),
        size: this.p.random(4, 14),
        phase: this.p.random(this.p.TWO_PI),
      });
    }

    // --- "Now we Sing" style special phrases ---
    let specials = [
      "--Now we  Sing --", "00000", "·····", "ht on them",
      "ost rote of situations", "s well to break up",
      "'t be where", "ut a", "of",
    ];
    for (let s of specials) {
      this.elements.push({
        type: "word",
        x: this.p.random(w * 0.03, w * 0.75),
        y: this.p.random(h * 0.5, h * 0.85),
        text: s, size: this.p.random(8, 11),
        phase: this.p.random(this.p.TWO_PI),
      });
    }
  }

  update() {
    this.t += 0.003;
  }

  render() {
    let g = this.buf!;
    g.clear();
    g.background(255);
    g.textFont("monospace");

    for (let el of this.elements) {
      let drift = this.p.sin(this.t * 0.8 + el.phase) * 2;

      if (el.type === "word") {
        g.noStroke();
        g.fill(15, 15, 15);
        g.textSize(el.size);
        g.textAlign(this.p.LEFT, this.p.TOP);
        g.textStyle(this.p.NORMAL);
        g.text(el.text, el.x + drift * 0.3, el.y);
      } else if (el.type === "bar") {
        g.noStroke();
        g.fill(15, 15, 15);
        g.rect(el.x, el.y + drift * 0.2, el.w, el.h);
      } else if (el.type === "dashed") {
        g.noStroke();
        g.fill(15, 15, 15);
        let dx = el.x;
        while (dx < el.x + el.len) {
          g.rect(dx, el.y + drift * 0.15, el.dashW, el.lineH);
          dx += el.dashW + el.gap;
        }
      } else if (el.type === "square") {
        g.noStroke();
        g.fill(15, 15, 15);
        g.rect(el.x, el.y, el.size, el.size);
      }
    }

    return g;
  }
}

export default ScatteredTextLayer;
