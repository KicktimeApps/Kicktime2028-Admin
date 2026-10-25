import { describe, expect, it } from "vitest";
import { usePinStore } from "./pin";

describe("PIN im Speicher", () => {
  it("entsperren und sperren", () => {
    usePinStore.getState().unlock("123456");
    expect(usePinStore.getState().pin).toBe("123456");
    usePinStore.getState().lock();
    expect(usePinStore.getState().pin).toBeNull();
  });
});
