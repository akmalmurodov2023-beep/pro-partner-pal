import type { ReactNode } from "react";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}