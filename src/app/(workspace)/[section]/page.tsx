import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (
    ![
      "dashboard",
      "my-work",
      "leads",
      "contacts",
      "companies",
      "deals",
      "tasks",
      "calendar",
      "communications",
      "quotations",
      "reports",
      "automations",
      "settings",
      "monitoring",
      "products",
      "templates",
    ].includes(section)
  )
    notFound();
  return null;
}

export const dynamicParams = false;
export function generateStaticParams() {
  return [
    "dashboard",
    "my-work",
    "leads",
    "contacts",
    "companies",
    "deals",
    "tasks",
    "calendar",
    "communications",
    "quotations",
    "reports",
    "automations",
    "settings",
    "monitoring",
    "products",
    "templates",
  ].map((section) => ({ section }));
}
