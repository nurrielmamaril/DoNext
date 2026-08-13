import {
  CalendarClock,
  CheckCircle2,
  ListTodo,
  Mail,
  NotebookPen,
  LayoutDashboard,
} from "lucide-react";

// Shared by the sidebar/drawer nav and by RoutePrefetcher, so the list of
// sections and the list of routes warmed on startup can't drift apart.
export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "All Tasks", icon: ListTodo },
  { href: "/deadlines", label: "Deadlines", icon: CalendarClock },
  { href: "/completed", label: "Completed", icon: CheckCircle2 },
  { href: "/scheduled-emails", label: "Scheduled Emails", icon: Mail },
  { href: "/notes", label: "General Notes", icon: NotebookPen },
];

export const navRoutes = [...navItems.map((item) => item.href), "/settings"];
