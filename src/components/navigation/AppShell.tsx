"use client";

import { ReactNode, useState } from "react";
import { AppSidebar } from "@/components/navigation/AppSidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="flex min-h-dvh bg-transparent">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
