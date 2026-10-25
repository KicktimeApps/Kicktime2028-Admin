import { describe, expect, it } from "vitest";
import type { ResultRecord } from "@/domain/types";
import { fixtureDiffs, scoreText, sourcesDiffer } from "./match-format";

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

describe("Tipp-Sperre vergleichen", () => {
  const app = [
    { id: "m01", kickoffUtc: "2028-06-09T19:00:00Z" },
    { id: "m02", kickoffUtc: "2028-06-10T13:00:00Z" },
    { id: "m03", kickoffUtc: "2028-06-10T16:00:00Z" },
  ];
  it("gleiche Zeiten (auch anders geschrieben) sind keine Abweichung", () => {
    const server = [
      { match_id: "m01", kickoff_utc: "2028-06-09T19:00:00+00:00" },
      { match_id: "m02", kickoff_utc: "2028-06-10T13:00:00.000Z" },
      { match_id: "m03", kickoff_utc: "2028-06-10T16:00:00Z" },
    ];
    expect(fixtureDiffs(app, server)).toEqual([]);
  });
  it("findet andere und fehlende Zeiten", () => {
    const server = [
      { match_id: "m01", kickoff_utc: "2028-06-09T19:00:00Z" },
      { match_id: "m02", kickoff_utc: "2028-06-10T16:00:00Z" },
    ];
    expect(fixtureDiffs(app, server)).toEqual([
      { id: "m02", app: "2028-06-10T13:00:00Z", server: "2028-06-10T16:00:00Z" },
      { id: "m03", app: "2028-06-10T16:00:00Z", server: null },
    ]);
  });
});
