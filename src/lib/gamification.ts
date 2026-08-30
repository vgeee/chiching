import { isSameDay, isYesterday } from "date-fns";
import { prisma } from "@/lib/prisma";
import type { Mood } from "@/generated/prisma/enums";

export const BADGE_CATALOG = {
  first_log: { label: "Getting Started", icon: "🎬" },
  streak_3: { label: "On a Roll", icon: "🔥" },
  streak_7: { label: "Week Warrior", icon: "⚡" },
  streak_30: { label: "Habit Master", icon: "👑" },
  logs_50: { label: "Half Century", icon: "💯" },
  self_aware: { label: "Impulse Radar", icon: "🎯" },
} as const;

export type BadgeCode = keyof typeof BADGE_CATALOG;

export function levelFromXp(xp: number) {
  const level = Math.floor(xp / 100) + 1;
  const xpIntoLevel = xp % 100;
  return { level, xpIntoLevel, xpForNextLevel: 100 };
}

/**
 * Called right after a transaction is logged. Updates streak/XP and
 * unlocks any badges the user just earned. Returns newly earned badges
 * so the UI can celebrate them.
 */
export async function recordExpenseActivity(mood: Mood) {
  const today = new Date();

  const state =
    (await prisma.gameState.findUnique({ where: { id: "singleton" } })) ??
    (await prisma.gameState.create({ data: { id: "singleton" } }));

  let currentStreak = state.currentStreak;
  if (!state.lastLogDate) {
    currentStreak = 1;
  } else if (isSameDay(state.lastLogDate, today)) {
    currentStreak = state.currentStreak || 1;
  } else if (isYesterday(state.lastLogDate)) {
    currentStreak = state.currentStreak + 1;
  } else {
    currentStreak = 1;
  }
  const longestStreak = Math.max(state.longestStreak, currentStreak);

  const xpGain = 10 + Math.min(currentStreak, 20);
  const xp = state.xp + xpGain;
  const { level } = levelFromXp(xp);

  await prisma.gameState.update({
    where: { id: "singleton" },
    data: { xp, level, currentStreak, longestStreak, lastLogDate: today },
  });

  const totalLogs = await prisma.transaction.count();
  const existingBadgeCodes = new Set((await prisma.badge.findMany({ select: { code: true } })).map((b) => b.code));

  const toAward: BadgeCode[] = [];
  if (totalLogs === 1) toAward.push("first_log");
  if (currentStreak === 3) toAward.push("streak_3");
  if (currentStreak === 7) toAward.push("streak_7");
  if (currentStreak === 30) toAward.push("streak_30");
  if (totalLogs === 50) toAward.push("logs_50");
  if (mood === "IMPULSE") toAward.push("self_aware");

  const newBadges = toAward.filter((code) => !existingBadgeCodes.has(code));

  if (newBadges.length > 0) {
    await prisma.badge.createMany({
      data: newBadges.map((code) => ({
        code,
        label: BADGE_CATALOG[code].label,
        icon: BADGE_CATALOG[code].icon,
      })),
      skipDuplicates: true,
    });
  }

  return { xpGain, currentStreak, newBadges: newBadges.map((code) => BADGE_CATALOG[code]) };
}
