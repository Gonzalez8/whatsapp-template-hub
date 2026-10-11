import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without `globals`, so Testing Library can't register its automatic cleanup.
afterEach(() => cleanup());

// jsdom doesn't implement scrolling; components call it to keep the selection visible.
// (Server-side tests run in the node environment, without DOM.)
if (typeof Element !== "undefined") Element.prototype.scrollIntoView = () => {};
