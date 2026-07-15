import { NotesPanel } from "@/components/lists/NotesPanel";

export default function GeneralNotesPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <NotesPanel
        listId={null}
        title="General Notes"
        emptyMessage="No general notes yet. Use this for anything that isn't tied to a specific client."
      />
    </div>
  );
}
