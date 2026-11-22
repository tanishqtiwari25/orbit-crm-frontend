import Link from "next/link";
export default function NotFound() {
  return (
    <main className="loading-screen">
      <h1>Page not found</h1>
      <Link className="button primary" href="/dashboard">
        Back to overview
      </Link>
    </main>
  );
}
