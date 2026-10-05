"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One search for the whole client rather than a box above each list: the
  // term is debounced here and handed to both, so a match in either section
  // surfaces from a single field.
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 300);
  }

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
        tasks are split in two, it needs to sit above both of them — and so
        does the search that covers them.
      */}
      <div className="-mb-3 flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl">{listName}</h1>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={`Search ${listName}...`}
            className="h-9 w-full pl-8"
          />
        </div>
      </div>

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
        newTask={{ recurring: true }}
        search={search}
        allowReorder={false}
        fullWidth
      />

      <TaskList
        title="One-off Tasks"
        filter={{ listId, recurring: false }}
        emptyMessage={`No one-off tasks in ${listName} yet.`}
        showListBadge={false}
        defaultListId={listId}
        newTask={{ recurring: false }}
        search={search}
        fullWidth
      />

      <NotesPanel listId={listId} />
    </div>
  );
}
