export function extractImageFromClipboard(e: { clipboardData: DataTransfer | null }): File | null {
  const items = e.clipboardData?.items;
  if (!items) return null;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (!file) continue;
      const ext = item.type.split("/")[1] || "png";
      if (file.name && file.name !== "image.png" && file.name !== "blob") return file;
      return new File([file], `pasted-${Date.now()}.${ext}`, { type: item.type });
    }
  }
  return null;
}
