"use client";

import { useRef, useState, useTransition } from "react";
import { createTransaction } from "@/app/actions/transactions";

type Category = { id: string; name: string; icon: string };

const MOODS = [
  { value: "PLANNED", label: "Planned", icon: "🧭" },
  { value: "IMPULSE", label: "Impulse", icon: "⚡" },
  { value: "NEED", label: "Need", icon: "✅" },
];

export function QuickAddForm({ categories }: { categories: Category[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ xpGain: number; streak: number; badges: { label: string; icon: string }[] } | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createTransaction(formData);
      formRef.current?.reset();
      setToast({ xpGain: result.xpGain, streak: result.currentStreak, badges: result.newBadges });
      setTimeout(() => setToast(null), 4500);
    });
  }

  return (
    <div className="card p-4 relative">
      <h2 className="font-semibold mb-3 flex items-center gap-2">⚡ Quick add</h2>
      <form ref={formRef} action={handleSubmit} className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400 mb-1">Amount (₹)</label>
          <input name="amount" type="number" step="0.01" min="0" required className="w-28" placeholder="500" />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400 mb-1">Category</label>
          <select name="categoryId" required className="w-40">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-neutral-400 mb-1">Mood</label>
          <select name="mood" className="w-32" defaultValue="PLANNED">
            {MOODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.icon} {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-[10rem]">
          <label className="text-xs text-neutral-400 mb-1">Note (optional)</label>
          <input name="note" type="text" placeholder="what was it for?" />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="h-9 px-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-500 font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Logging…" : "Log it"}
        </button>
      </form>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 shadow-2xl z-50">
          <p className="text-sm text-emerald-400 font-medium">
            +{toast.xpGain} XP · 🔥 {toast.streak} day streak
          </p>
          {toast.badges.length > 0 && (
            <p className="text-sm mt-1">
              New badge{toast.badges.length > 1 ? "s" : ""}:{" "}
              {toast.badges.map((b) => `${b.icon} ${b.label}`).join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
