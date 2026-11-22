import { Suspense } from "react";
import { LoginPage } from "@/frontend/pages/login";
export default function Login() {
  return (
    <Suspense fallback={<div className="loading-screen">Loading…</div>}>
      <LoginPage />
    </Suspense>
  );
}
