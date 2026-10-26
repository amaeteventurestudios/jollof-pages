import { today } from "./slug";
import type { BookGoal, WritingLog } from "./types";

/** Sum words per day across books. */
export function wordsByDay(logs: Pick<WritingLog, "date" | "words">[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const l of logs) m.set(l.date, (m.get(l.date) ?? 0) + (l.words || 0));
  return m;
}

export function lastDays(n: number, end = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(today(new Date(end.getTime() - i * 86400000)));
  return out;
}

/** Consecutive days (ending today, or yesterday if today is still empty) with at least `min` words. */
export function streak(byDay: Map<string, number>, min = 1, end = new Date()): number {
  let n = 0;
  let d = new Date(end);
  if ((byDay.get(today(d)) ?? 0) < min) d = new Date(d.getTime() - 86400000);
  while ((byDay.get(today(d)) ?? 0) >= min) {
    n++;
    d = new Date(d.getTime() - 86400000);
  }
  return n;
}

export interface GoalPlan {
  remaining: number;
  daysLeft: number | null;
  perDay: number | null;
  percent: number;
  onTrack: boolean | null;
}

/** Words per day needed to hit the target by the deadline. */
export function goalPlan(goal: BookGoal, written: number, now = new Date()): GoalPlan {
  const remaining = Math.max(goal.targetWords - written, 0);
  const percent = goal.targetWords ? Math.min(100, Math.round((written / goal.targetWords) * 100)) : 0;
  if (!goal.deadline) return { remaining, daysLeft: null, perDay: null, percent, onTrack: null };
  const end = new Date(`${goal.deadline}T23:59:59`);
  const daysLeft = Math.max(Math.ceil((end.getTime() - now.getTime()) / 86400000), 0);
  const perDay = daysLeft ? Math.ceil(remaining / daysLeft) : remaining;
  return { remaining, daysLeft, perDay, percent, onTrack: perDay <= Math.max(goal.dailyWords, 1) };
}

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
