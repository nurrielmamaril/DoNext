"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LogoCropDialog } from "@/components/lists/LogoCropDialog";
import { useUploadListLogo } from "@/lib/hooks/useLists";
import { cn } from "@/lib/utils";

function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

interface CategoryAvatarProps {
  listId: string;
  name: string;
  logoUrl: string | null;
  size?: "sm" | "lg";
  editable?: boolean;
}

export function CategoryAvatar({
  listId,
  name,
  logoUrl,
  size = "sm",
  editable = false,
}: CategoryAvatarProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  const uploadLogo = useUploadListLogo();

  const current = preview ?? logoUrl;

  function openCropper() {
    if (!editable) return;
    // With a logo already set, go straight to positioning it — that is the
    // thing you cannot otherwise do. Without one, ask for a file first.
    if (current) {
      setCropSrc(current);
      setCropOpen(true);
    } else {
      inputRef.current?.click();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
    setCropOpen(true);
  }

  async function handleCropped(blob: Blob) {
    const file = new File([blob], "logo.png", { type: "image/png" });
    try {
      await uploadLogo.mutateAsync({ listId, file });
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(blob);
      setPreview(previewUrl.current);
      setCropOpen(false);
      toast.success("Logo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload image");
    }
  }

  const dimension = size === "lg" ? "size-20" : "size-6";

  return (
    <>
      <div
        className={cn("relative shrink-0", editable && "group cursor-pointer")}
        onClick={openCropper}
        role={editable ? "button" : undefined}
        aria-label={editable ? "Change category image" : undefined}
      >
        <Avatar className={dimension}>
          <AvatarImage src={current ?? undefined} alt={name} />
          <AvatarFallback className={size === "lg" ? "text-xl font-heading" : undefined}>
            {initialsFor(name)}
          </AvatarFallback>
        </Avatar>
        {editable && (
          <>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6 text-white" />
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {editable && (
        <LogoCropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          initialSrc={cropSrc}
          saving={uploadLogo.isPending}
          onSave={handleCropped}
        />
      )}
    </>
  );
}
