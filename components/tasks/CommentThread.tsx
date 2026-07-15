"use client";

import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Send, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCommentsQuery, useCreateComment, useDeleteComment } from "@/lib/hooks/useComments";

export function CommentThread({ taskId }: { taskId: string }) {
  const { data: comments } = useCommentsQuery(taskId);
  const createComment = useCreateComment(taskId);
  const deleteComment = useDeleteComment(taskId);
  const [content, setContent] = useState("");

  async function handleAdd() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setContent("");
    try {
      await createComment.mutateAsync(trimmed);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add comment");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteComment.mutateAsync(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete comment");
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Comments</span>

      {comments && comments.length > 0 && (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="group flex items-start justify-between gap-2 rounded-md border px-2 py-1.5">
              <div className="min-w-0">
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="shrink-0 opacity-0 group-hover:opacity-100"
                aria-label="Delete comment"
                onClick={() => handleDelete(comment.id)}
              >
                <X className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Add a comment or update..."
          className="flex-1"
        />
        <Button
          type="button"
          size="icon-sm"
          disabled={!content.trim()}
          aria-label="Post comment"
          onClick={handleAdd}
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
