import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the technical foundation screen", () => {
    vi.stubGlobal("fetch", () => new Promise(() => undefined));

    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: "Technical foundation is ready"
      })
    ).toBeInTheDocument();
    expect(screen.getByText("ETRN Flow")).toBeInTheDocument();
  });
});
