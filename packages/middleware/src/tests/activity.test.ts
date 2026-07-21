import assert from "node:assert/strict";
import { test } from "node:test";
import { groupActivityByDay } from "@/services/activity";
import type { XpGrant } from "@/services/xp";

test("groupActivityByDay buckets grants by their learner date, newest first", () => {
  const grants: XpGrant[] = [
    {
      area: "Reading",
      feature: "reading",
      xp: 3,
      at: new Date("2026-07-19"),
      dateOnly: "2026-07-19",
      sourceId: "r1",
      title: "Chapter 3",
    },
    {
      area: "Grammar",
      feature: "theoryStudy",
      xp: 3.5,
      at: new Date("2026-07-20"),
      dateOnly: "2026-07-20",
      sourceId: "t1",
      title: "Genki",
    },
  ];
  const days = groupActivityByDay(grants);
  assert.equal(days.length, 2);
  // Newest day first.
  assert.equal(days[0].date, "2026-07-20");
  assert.equal(days[1].date, "2026-07-19");
  assert.equal(days[0].totalXp, 3.5);
  assert.equal(days[0].items[0].id, "t1");
  assert.equal(days[0].items[0].title, "Genki");
  assert.equal(days[0].items[0].type, "theoryStudy");
});

test("groupActivityByDay merges grants sharing a source within a day", () => {
  // A lesson emits two grants (listening + vocab) with the same sourceId; they should merge.
  const grants: XpGrant[] = [
    {
      area: "Listening",
      feature: "lessons",
      xp: 2,
      at: new Date("2026-07-20"),
      dateOnly: "2026-07-20",
      sourceId: "lesson1",
      title: "Lesson with Yuki",
    },
    {
      area: "Vocabulary",
      feature: "lessons",
      xp: 1.5,
      at: new Date("2026-07-20"),
      dateOnly: "2026-07-20",
      sourceId: "lesson1",
      title: "Lesson with Yuki",
    },
  ];
  const days = groupActivityByDay(grants);
  assert.equal(days.length, 1);
  assert.equal(days[0].items.length, 1);
  assert.equal(days[0].items[0].xp, 3.5);
  assert.equal(days[0].totalXp, 3.5);
});

test("groupActivityByDay keeps sourceless grants separate and sorts items by XP", () => {
  const grants: XpGrant[] = [
    {
      area: "Writing",
      feature: "writing",
      xp: 1,
      at: new Date("2026-07-20T10:00:00Z"),
      // no sourceId
    },
    {
      area: "Writing",
      feature: "writing",
      xp: 2,
      at: new Date("2026-07-20T11:00:00Z"),
      // no sourceId → must not merge with the one above
    },
  ];
  const days = groupActivityByDay(grants);
  assert.equal(days.length, 1);
  assert.equal(days[0].items.length, 2);
  // Highest XP first.
  assert.equal(days[0].items[0].xp, 2);
  assert.equal(days[0].items[1].xp, 1);
  assert.equal(days[0].items[0].id, null);
});

test("groupActivityByDay falls back to the local calendar day for grants without dateOnly", () => {
  // 01:00 July 20 local for a UTC+2 caller (tzOffsetMinutes = −120) is 23:00 Jul 19 UTC.
  const grants: XpGrant[] = [
    {
      area: "Reading",
      feature: "reading",
      xp: 2,
      at: new Date("2026-07-19T23:00:00Z"),
      sourceId: "r1",
    },
  ];
  const days = groupActivityByDay(grants, -120);
  assert.equal(days[0].date, "2026-07-20");
});
