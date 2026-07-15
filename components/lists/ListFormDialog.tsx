"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listSchema, type ListInput } from "@/lib/validations/list.schema";
import { useCreateList, useUpdateList, useListsQuery } from "@/lib/hooks/useLists";

interface ListFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list?: { id: string; name: string; color: string | null } | null;
}

export function ListFormDialog({ open, onOpenChange, list }: ListFormDialogProps) {
  const { data: lists } = useListsQuery();
  const createList = useCreateList();
  const updateList = useUpdateList();
  const isEditing = Boolean(list);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ListInput>({
    resolver: zodResolver(listSchema),
    defaultValues: { name: "", color: null },
  });

  useEffect(() => {
    if (open) reset({ name: list?.name ?? "", color: list?.color ?? null });
  }, [open, list, reset]);

  async function onSubmit(values: ListInput) {
    try {
      if (isEditing && list) {
        await updateList.mutateAsync({ id: list.id, ...values });
        toast.success("Category updated");
      } else {
        const position = (lists?.length ?? 0) + 1;
        await createList.mutateAsync({ ...values, position });
        toast.success("Category created");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Rename category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="list-name">Name</Label>
            <Input
              id="list-name"
              placeholder="e.g. Connor Trupp"
              autoFocus
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
