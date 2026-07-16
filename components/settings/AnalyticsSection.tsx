import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsSectionProps {
  signups: { id: string; email: string; created_at: string }[];
  totalCount: number;
}

export function AnalyticsSection({ signups, totalCount }: AnalyticsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-2xl font-semibold">{totalCount}</p>
          <p className="text-sm text-muted-foreground">Total signups</p>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
          {signups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No signups yet.</p>
          ) : (
            signups.map((signup) => (
              <div key={signup.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{signup.email}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {format(new Date(signup.created_at), "MMM d, yyyy")}
                </span>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Site visit stats are available on your{" "}
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Vercel dashboard
          </a>{" "}
          under Analytics.
        </p>
      </CardContent>
    </Card>
  );
}
