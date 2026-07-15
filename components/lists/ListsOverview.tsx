"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useListsQuery } from "@/lib/hooks/useLists";
import { ListFormDialog } from "@/components/lists/ListFormDialog";

export function ListsOverview() {
  const { data: lists, isLoading } = useListsQuery();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-lg font-semibold">Lists</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" /> New list
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!isLoading && lists?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Folder className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No lists yet. Create one for each client you manage.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-2">
        {lists?.map((list) => (
          <Link key={list.id} href={`/lists/${list.id}`}>
            <Card className="transition-colors hover:bg-accent/40">
              <CardContent className="flex items-center gap-3 py-3">
                <Folder className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{list.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <ListFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
