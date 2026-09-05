"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { disconnectMisoca } from "@/lib/misoca/actions";

export function MisocaDisconnectButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setIsSubmitting(true);
    const result = await disconnectMisoca();
    setIsSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-danger-text">{error}</p>}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={handleClick}
        className="rounded-md border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-page-bg disabled:opacity-40"
      >
        連携を解除
      </button>
    </div>
  );
}
