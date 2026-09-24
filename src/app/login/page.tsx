import { redirect } from "next/navigation";
import { authEnabled, safeNext } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  const next = safeNext(searchParams.next);
  if (!authEnabled()) redirect(next);

  return (
    <div className="login">
      <header className="page-head" style={{ marginBottom: 8 }}>
        <div>
          <p className="eyebrow">Fitness Tracker</p>
          <h1>Sign in</h1>
        </div>
      </header>
      <p className="muted" style={{ marginBottom: 20 }}>
        Once per device — you&apos;ll stay signed in.
      </p>
      <form method="post" action="/api/login" className="card" style={{ display: "grid", gap: 14 }}>
        <input type="hidden" name="next" value={next} />
        <label className="field">
          <span>Username</span>
          <input name="user" autoComplete="username" autoCapitalize="none" autoCorrect="off" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        {searchParams.error && (
          <p style={{ color: "var(--bad)", fontWeight: 600, fontSize: 14 }}>
            That didn&apos;t match. Try again.
          </p>
        )}
        <button type="submit" className="sun btn-block">
          Sign in
        </button>
      </form>
    </div>
  );
}
