"use client";

import { useRef, useState } from "react";
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
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  CalendarClock,
  CheckCircle2,
  ListTodo,
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
import {
  useListsQuery,
  useDeleteList,
  useReorderLists,
} from "@/lib/hooks/useLists";
import { useSidebarPrefs, MIN_WIDTH, MAX_WIDTH } from "@/lib/hooks/useSidebarPrefs";
import { ListFormDialog } from "@/components/lists/ListFormDialog";
import { SidebarListItem } from "@/components/lists/SidebarListItem";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { AppearanceMenu } from "@/components/layout/AppearanceMenu";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "All Tasks", icon: ListTodo },
  { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
  { href: "/completed", label: "Completed", icon: CheckCircle2 },
  { href: "/notes", label: "General Notes", icon: NotebookPen },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: lists } = useListsQuery();
  const deleteList = useDeleteList();
  const reorderLists = useReorderLists();
  const { toggleCollapsed, setWidth } = useSidebarPrefs();

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<{ id: string; name: string; color: string | null } | null>(null);
  const [deletingList, setDeletingList] = useState<{ id: string; name: string } | null>(null);

  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

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

  function handleResizePointerMove(e: PointerEvent) {
    if (!dragState.current) return;
    const next = Math.min(
      Math.max(dragState.current.startWidth + (e.clientX - dragState.current.startX), MIN_WIDTH),
      MAX_WIDTH
    );
    document.documentElement.style.setProperty("--sidebar-width", `${next}px`);
  }

  function handleResizePointerUp(e: PointerEvent) {
    if (!dragState.current) return;
    const next = Math.min(
      Math.max(dragState.current.startWidth + (e.clientX - dragState.current.startX), MIN_WIDTH),
      MAX_WIDTH
    );
    setWidth(next);
    dragState.current = null;
    window.removeEventListener("pointermove", handleResizePointerMove);
    window.removeEventListener("pointerup", handleResizePointerUp);
  }

  function handleResizePointerDown(e: React.PointerEvent) {
    dragState.current = {
      startX: e.clientX,
      startWidth: parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-width"), 10),
    };
    window.addEventListener("pointermove", handleResizePointerMove);
    window.addEventListener("pointerup", handleResizePointerUp);
  }

  return (
    <aside
      className="sidebar-aside relative flex h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground"
      style={{ width: "var(--sidebar-width)" }}
    >
      <div className="flex items-center justify-between p-4">
        <h1 data-collapse-hide className="font-heading text-lg">
          DoNext
        </h1>
        <Button variant="ghost" size="icon-xs" onClick={toggleCollapsed} aria-label="Toggle sidebar">
          <PanelLeftClose data-collapse-hide className="size-4" />
          <PanelLeftOpen data-collapse-only className="size-4" />
        </Button>
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
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
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

      <div className="border-t p-2">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/settings"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50",
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

      <div
        data-collapse-hide
        onPointerDown={handleResizePointerDown}
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-accent"
        aria-hidden
      />

      <ListFormDialog open={listDialogOpen} onOpenChange={setListDialogOpen} list={editingList} />
      <ConfirmDialog
        open={Boolean(deletingList)}
        onOpenChange={(open) => !open && setDeletingList(null)}
        title={`Delete "${deletingList?.name}"?`}
        description="Tasks in this category will become uncategorized. This can't be undone."
        onConfirm={confirmDeleteList}
      />
    </aside>
  );
}
