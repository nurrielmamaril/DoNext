"use client";

import { TaskList } from "@/components/tasks/TaskList";
import { NotesPanel } from "@/components/lists/NotesPanel";
import { CategoryAvatar } from "@/components/lists/CategoryAvatar";
import { ListImportExport } from "@/components/lists/ListImportExport";

interface ListDetailViewProps {
  listId: string;
  listName: string;
  logoUrl: string | null;
}

export function ListDetailView({ listId, listName, logoUrl }: ListDetailViewProps) {
  return (
    <div className="flex flex-col gap-8 p-6">
      <div className="flex items-center justify-between gap-3 px-4 pt-2">
        <div className="flex items-center gap-3">
          <CategoryAvatar listId={listId} name={listName} logoUrl={logoUrl} size="lg" editable />
          <p className="text-xs text-muted-foreground">
            Click the circle to upload a logo or photo for this client.
          </p>
        </div>
        <ListImportExport listId={listId} listName={listName} />
      </div>

      {/*
        The client's name used to be the task list's own heading. Now that the
        tasks are split in two, it needs to sit above both of them.
      */}
      <h1 className="font-heading -mb-3 px-4 text-2xl">{listName}</h1>

      {/*
        One client's work reads as three separate things: the commitments that
        come back on a schedule, the one-off jobs you work through, and the
        reference material that is not a job at all. The recurring ones lead
        because they are the standing shape of the account.
      */}
      <TaskList
        title="Recurring Tasks"
        filter={{ listId, recurring: true }}
        emptyMessage={`Nothing repeats in ${listName} yet. Set a task to repeat and it will show up here.`}
        showListBadge={false}
        defaultListId={listId}
        allowQuickAdd={false}
        allowReorder={false}
        fullWidth
      />

      <TaskList
        title="One-off Tasks"
        filter={{ listId, recurring: false }}
        emptyMessage={`No one-off tasks in ${listName} yet.`}
        showListBadge={false}
        defaultListId={listId}
        fullWidth
      />

      <NotesPanel listId={listId} />
    </div>
  );
}
