import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListDetailView } from "@/components/lists/ListDetailView";

export default async function ListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("lists")
    .select("id, name, logo_url")
    .eq("id", id)
    .single();

  if (!list) notFound();

  return <ListDetailView listId={list.id} listName={list.name} logoUrl={list.logo_url} />;
}
