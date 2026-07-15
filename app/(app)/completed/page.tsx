"use client";

import { TaskList } from "@/components/tasks/TaskList";

export default function CompletedPage() {
  return (
    <div className="p-6">
      <TaskList
        title="Completed"
        filter={{ view: "completed" }}
        emptyMessage="No completed tasks yet."
        allowQuickAdd={false}
      />
    </div>
  );
}
