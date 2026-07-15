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
    <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-stretch">
      <div className="lg:w-1/2">
        <div className="flex items-center justify-between gap-3 px-4 pt-2">
          <div className="flex items-center gap-3">
            <CategoryAvatar listId={listId} name={listName} logoUrl={logoUrl} size="lg" editable />
            <p className="text-xs text-muted-foreground">
              Click the circle to upload a logo or photo for this client.
            </p>
          </div>
          <ListImportExport listId={listId} listName={listName} />
        </div>
        <TaskList
          title={listName}
          filter={{ listId }}
          emptyMessage={`No tasks in ${listName} yet.`}
          showListBadge={false}
          defaultListId={listId}
          fullWidth
        />
      </div>
      <div className="lg:w-1/2">
        <NotesPanel listId={listId} />
      </div>
    </div>
  );
}
