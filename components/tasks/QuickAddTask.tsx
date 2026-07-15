"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateTask } from "@/lib/hooks/useTasks";

export function QuickAddTask({ defaultListId }: { defaultListId?: string | null }) {
  const [title, setTitle] = useState("");
  const createTask = useCreateTask();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle("");
    await createTask.mutateAsync({
      title: trimmed,
      list_id: defaultListId ?? null,
      priority: "low",
      status: "not_started",
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-b px-4 py-2.5">
      <Plus className="size-4 shrink-0 text-muted-foreground" />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task and press Enter..."
        className="border-none px-0 shadow-none focus-visible:ring-0"
      />
      {title.trim() && (
        <Button type="submit" size="sm" disabled={createTask.isPending}>
          Add
        </Button>
      )}
    </form>
  );
}
