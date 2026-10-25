import { describe, expect, it } from "vitest";
import type { ResultRecord } from "@/domain/types";
import { scoreText, sourcesDiffer } from "./match-format";

const r = (status: ResultRecord["status"], h: number, a: number, pens?: [number, number]) =>
  ({
    status,
    score: { home: h, away: a },
    penalties: pens ? { home: pens[0], away: pens[1] } : undefined,
    source: "api",
    updatedAt: 0,
  }) satisfies ResultRecord;

describe("Spiele-Check", () => {
  it("Stand als Text", () => {
    expect(scoreText(undefined)).toBe("–");
    expect(scoreText(r("finished", 1, 1, [4, 3]))).toBe("1:1 i. E. 4:3");
  });
  it("Abweichung nur, wenn beide Quellen etwas melden", () => {
    expect(sourcesDiffer(r("live", 1, 0), undefined)).toBe(false);
    expect(sourcesDiffer(r("live", 1, 0), r("live", 1, 0))).toBe(false);
    expect(sourcesDiffer(r("live", 1, 0), r("live", 2, 0))).toBe(true);
    // Eine Quelle meldet schon das Spielende.
    expect(sourcesDiffer(r("live", 1, 0), r("finished", 1, 0))).toBe(true);
  });
});
