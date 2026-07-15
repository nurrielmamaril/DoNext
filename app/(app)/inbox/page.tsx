"use client";

import { TaskList } from "@/components/tasks/TaskList";

export default function InboxPage() {
  return (
    <div className="p-6">
      <TaskList
        title="Inbox"
        filter={{ view: "inbox" }}
        emptyMessage="Nothing in your inbox. New tasks without a list land here."
        showListBadge={false}
      />
    </div>
  );
}
