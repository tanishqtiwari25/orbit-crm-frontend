"use client";
import { useEffect } from "react";
import Link from "next/link";
export default function Home() {
  useEffect(() => {
    window.location.replace("/dashboard/");
  }, []);
  return (
    <main className="loading-screen">
      <Link href="/dashboard/">Open workspace</Link>
    </main>
  );
}
