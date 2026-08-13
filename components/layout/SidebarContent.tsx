"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import {
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Mail,
  NotebookPen,
  Settings,
  Plus,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useListsQuery, useDeleteList, useReorderLists } from "@/lib/hooks/useLists";
import { ListFormDialog } from "@/components/lists/ListFormDialog";
import { SidebarListItem } from "@/components/lists/SidebarListItem";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppearanceMenu } from "@/components/layout/AppearanceMenu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "All Tasks", icon: ListTodo },
  { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
  { href: "/completed", label: "Completed", icon: CheckCircle2 },
  { href: "/scheduled-emails", label: "Scheduled Emails", icon: Mail },
  { href: "/notes", label: "General Notes", icon: NotebookPen },
];

interface SidebarContentProps {
  userEmail: string;
  /** Desktop only — the mobile drawer has no collapsed state. */
  onToggleCollapsed?: () => void;
  /**
   * Mobile only — called with the tapped link's href so the drawer can decide
   * when to close. It deliberately does NOT close on tap: see MobileTopBar.
   */
  onNavigate?: (href: string) => void;
}

// Shared by the desktop sidebar and the mobile drawer so there is only ever
// one nav list to keep in sync.
export function SidebarContent({ userEmail, onToggleCollapsed, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: lists } = useListsQuery();
  const deleteList = useDeleteList();
  const reorderLists = useReorderLists();

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<{ id: string; name: string; color: string | null } | null>(null);
  const [deletingList, setDeletingList] = useState<{ id: string; name: string } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !lists) return;
    const oldIndex = lists.findIndex((l) => l.id === active.id);
    const newIndex = lists.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(lists, oldIndex, newIndex);
    reorderLists.mutate(reordered.map((l, i) => ({ id: l.id, position: i + 1 })));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  async function confirmDeleteList() {
    if (!deletingList) return;
    try {
      await deleteList.mutateAsync(deletingList.id);
      toast.success(`Deleted "${deletingList.name}"`);
      if (pathname === `/lists/${deletingList.id}`) router.push("/inbox");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete list");
    } finally {
      setDeletingList(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-4">
        <h1 data-collapse-hide className="font-heading text-lg">
          DoNext
        </h1>
        {onToggleCollapsed && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onToggleCollapsed}
            aria-label="Toggle sidebar"
          >
            <PanelLeftClose data-collapse-hide className="size-4" />
            <PanelLeftOpen data-collapse-only className="size-4" />
          </Button>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger
                render={
                  <Link
                    href={item.href}
                    onClick={() => onNavigate?.(item.href)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-2.5 text-sm md:py-1.5",
                      isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                    )}
                  />
                }
              >
                <Icon className="size-4 shrink-0" />
                <span data-collapse-hide>{item.label}</span>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="mt-6 flex flex-1 flex-col overflow-hidden px-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span data-collapse-hide className="text-xs font-medium text-muted-foreground">
            Categories
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              setEditingList(null);
              setListDialogOpen(true);
            }}
            aria-label="New category"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={lists?.map((l) => l.id) ?? []} strategy={verticalListSortingStrategy}>
              {lists?.map((list) => (
                <SidebarListItem
                  key={list.id}
                  list={list}
                  onRename={() => {
                    setEditingList(list);
                    setListDialogOpen(true);
                  }}
                  onDelete={() => setDeletingList(list)}
                  onNavigate={onNavigate}
                />
              ))}
            </SortableContext>
          </DndContext>
          {lists?.length === 0 && (
            <p data-collapse-hide className="px-2 py-2 text-xs text-muted-foreground">
              No categories yet. Create one for each client.
            </p>
          )}
        </div>
      </div>

      <div className="safe-bottom border-t p-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/settings"
                onClick={() => onNavigate?.("/settings")}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-2.5 text-sm hover:bg-accent/50 md:py-1.5",
                  pathname === "/settings" && "bg-accent text-accent-foreground"
                )}
              />
            }
          >
            <Settings className="size-4 shrink-0" />
            <span data-collapse-hide>Settings</span>
          </TooltipTrigger>
          <TooltipContent side="right">Settings</TooltipContent>
        </Tooltip>
        <div className="sidebar-footer-row mt-1 flex items-center justify-between gap-1 px-2 py-1.5">
          <span data-collapse-hide className="truncate text-xs text-muted-foreground">
            {userEmail}
          </span>
          <div className="flex shrink-0 items-center">
            <AppearanceMenu />
            <Button variant="ghost" size="icon-xs" onClick={handleLogout} aria-label="Log out">
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <ListFormDialog open={listDialogOpen} onOpenChange={setListDialogOpen} list={editingList} />
      <ConfirmDialog
        open={Boolean(deletingList)}
        onOpenChange={(open) => !open && setDeletingList(null)}
        title={`Delete "${deletingList?.name}"?`}
        description="Tasks in this category will become uncategorized. This can't be undone."
        onConfirm={confirmDeleteList}
      />
    </>
  );
}
