import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import { api, ApiError, type Link } from "../api";
import { useAuth } from "../AuthContext";

// Short links are served by the API, not by the Vite dev server.
const SHORT_BASE = import.meta.env.VITE_SHORT_BASE ?? "http://localhost:3000";

export default function Dashboard() {
  const { user, logout } = useAuth();

  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

useEffect(() => {
  async function loadLinks() {
    try {
      const data = await api.listLinks();
      setLinks(Array.isArray(data) ? data : []);
    } catch {
      setListError("Could not load your links.");
    } finally {
      setLoading(false);
    }
  }

  loadLinks();
}, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const created = await api.createLink(url.trim());
      setLinks((prev) => [created, ...prev]); // show it immediately
      setUrl("");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setFormError("Slow down: you're creating links too quickly.");
        else if (err.status === 400) setFormError("Enter a valid URL starting with http:// or https://");
        else setFormError("Could not create the link.");
      } else {
        setFormError("Could not reach the server.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copy(link: Link) {
    const shortUrl = `${SHORT_BASE}/${link.code}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1500);
    } catch {
      window.prompt("Copy this link:", shortUrl); // fallback if clipboard is blocked
    }
  }

  return (
    <main style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Your links</h1>
        <div>
          <span style={{ marginRight: "1rem" }}>{user?.email ?? `User ${user?.id}`}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      <form onSubmit={handleCreate} style={{ display: "flex", gap: "0.5rem", margin: "1rem 0" }}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/some/long/page"
          required
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Shorten"}
        </button>
      </form>
      {formError && <p role="alert" style={{ color: "crimson" }}>{formError}</p>}

      {loading && <p>Loading...</p>}
      {listError && <p role="alert" style={{ color: "crimson" }}>{listError}</p>}
      {!loading && !listError && links.length === 0 && (
        <p>No links yet. Paste a URL above to create your first one.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.75rem" }}>
        {links.map((link) => (
          <li key={link.id} style={{ border: "1px solid #ccc", borderRadius: 6, padding: "0.75rem" }}>
            <div>
              <a href={`${SHORT_BASE}/${link.code}`} target="_blank" rel="noreferrer">
                {SHORT_BASE}/{link.code}
              </a>
            </div>
            <div style={{ color: "#666", overflowWrap: "anywhere", fontSize: "0.9rem" }}>
              {link.target_url}
            </div>
            <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <button onClick={() => copy(link)}>{copiedId === link.id ? "Copied!" : "Copy"}</button>
              <RouterLink to={`/links/${link.id}`}>View stats</RouterLink>
              <small style={{ color: "#888" }}>
                {new Date(link.created_at).toLocaleDateString()}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}