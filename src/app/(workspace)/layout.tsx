"use client";
import { usePathname } from "next/navigation";
import { WorkspacePage } from "@/frontend/pages/workspace";
export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const section = usePathname().split("/")[1] || "dashboard";
  return (
    <>
      <WorkspacePage section={section} />
      {children}
    </>
  );
}
