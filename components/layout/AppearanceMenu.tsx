"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ACCENTS } from "@/lib/theme/accents";
import { useAccent } from "@/components/providers/AccentProvider";

const modes = [
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
  { key: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceMenu() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();
  const mountedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      setMounted(true);
    }
  }, []);

  if (!mounted) {
    return <Button variant="ghost" size="icon-xs" disabled aria-label="Appearance" />;
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Appearance" />}>
        <Palette className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Theme</p>
            <div className="flex gap-1">
              {modes.map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={theme === key ? "default" : "outline"}
                  className="flex-1 px-0"
                  onClick={() => setTheme(key)}
                  aria-label={label}
                  title={label}
                >
                  <Icon className="size-3.5" />
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Accent color</p>
            <div className="flex flex-wrap gap-2">
              {ACCENTS.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAccent(a.key)}
                  aria-label={a.label}
                  title={a.label}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border-2",
                    accent === a.key ? "border-foreground" : "border-transparent"
                  )}
                >
                  <span
                    className="flex size-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: a.swatch }}
                  >
                    {accent === a.key && <Check className={cn("size-3", a.checkClass)} />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
