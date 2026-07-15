"use client";

import { TaskList } from "@/components/tasks/TaskList";

export default function DeadlinesPage() {
  return (
    <div className="p-6">
      <h1 className="font-heading px-4 pb-2 text-2xl">Task Deadlines Overview</h1>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 lg:w-1/2">
          <TaskList
            title="Today"
            filter={{ view: "today" }}
            emptyMessage="Nothing due today. Enjoy the breathing room."
            allowQuickAdd={false}
            fullWidth
          />
        </div>
        <div className="flex-1 lg:w-1/2">
          <TaskList
            title="Upcoming"
            filter={{ view: "upcoming" }}
            emptyMessage="Nothing scheduled after today yet."
            allowQuickAdd={false}
            fullWidth
          />
        </div>
      </div>
    </div>
  );
}
