import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Module1Explore } from "./Module1Explore";

describe("Module1Explore markup and layout contract", () => {
  it("renders the interactive bottom sheet handle with accessible affordance", () => {
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
        timingControls: createElement(
          "div",
          { id: "mock-timing-controls" },
          "Mock Timing",
        ),
      }),
    );

    expect(html).toContain("RENCANA PERJALANAN");
    expect(html).toContain("TUJUAN POPULER");
    expect(html).toContain("chip-monas");
    expect(html).toContain("chip-gi");
    expect(html).toContain("chip-gbk");
    expect(html).toContain("explore-bottom-sheet-container");
    expect(html).toContain("explore-bottom-sheet");
    expect(html).toContain('aria-controls="explore-bottom-sheet"');
    expect(html).toContain("Lihat opsi &amp; waktu");
  });

  it("automatically expands when planEnabled is true and prevents collision", () => {
    const html = renderToStaticMarkup(
      createElement(Module1Explore, {
        activeContext: "origin",
        planEnabled: true,
        onOpenSearch: () => undefined,
        onSelectDestination: () => undefined,
        timingControls: createElement(
          "div",
          { id: "mock-timing-controls" },
          "Mock Timing",
        ),
      }),
    );

    expect(html).toContain("max-h-[calc(100%-236px)]");
    expect(html).toContain("Tutup detail");
    expect(html).toContain("mock-timing-controls");
  });
});
