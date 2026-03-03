import "@testing-library/jest-dom";
import { vi } from "vitest";

const originalLog = console.log.bind(console);
const silencedPatterns = ["[PERF]", "[POST-STREAM TASKS COMPLETE]"];

vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
  const firstArg = typeof args[0] === "string" ? args[0] : "";
  const shouldSilence = silencedPatterns.some((pattern) =>
    firstArg.includes(pattern)
  );

  if (shouldSilence) return;
  originalLog(...args);
});
