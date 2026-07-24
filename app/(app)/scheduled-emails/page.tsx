import { ScheduledEmailsList } from "@/components/scheduled-emails/ScheduledEmailsList";

export default function ScheduledEmailsPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="font-heading px-4 pb-2 text-2xl">Scheduled Emails</h1>
      <ScheduledEmailsList />
    </div>
  );
}
