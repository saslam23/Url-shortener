import { useAuth } from "../AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  return (
    <main style={{ padding: "1rem" }}>
      <h1>Dashboard</h1>
      <p>Logged in as user {user?.id}</p>
      <button onClick={logout}>Log out</button>
    </main>
  );
}