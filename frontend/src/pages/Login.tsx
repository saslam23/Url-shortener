import {useState, type SubmitEvent} from "react";
import {Navigate, useNavigate} from "react-router";
import {useAuth} from "../AuthContext";
import {ApiError} from "../api";



export default function Login(){
    const {user, loading, login, register} = useAuth();
    const navigate = useNavigate();
    
    const [mode, setMode] = useState<"login"|"register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    if(!loading && user) return <Navigate to="/dashboard" replace/>;


    async function handleSubmit(e: SubmitEvent){
        e.preventDefault();
        setSubmitting(true);
        try {
            if(mode ==='login'){
                await login(email, password)
            }else{await register(email, password)}
            navigate('/dashboard');
        } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) setError("Too many attempts. Wait a minute and try again.");
        else if (err.status === 401) setError("Invalid email or password.");
        else if (err.status === 409 || err.message === "User already exists")
          setError("That email is already registered. Try logging in.");
        else if (err.status === 400) setError("Enter a valid email and a password of at least 8 characters.");
        else setError("Something went wrong. Please try again.");
      } else {
        setError("Could not reach the server.");
      }
    } finally {
      setSubmitting(false);
    }
    }
    return(
        <main style={{ maxWidth: 360, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>{mode === "login" ? "Log in" : "Create account"}</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>

        {error && <p role="alert" style={{ color: "crimson", margin: 0 }}>{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>

      <p>
        {mode === "login" ? "No account yet? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          style={{ background: "none", border: "none", color: "blue", cursor: "pointer", padding: 0 }}
        >
          {mode === "login" ? "Create one" : "Log in"}
        </button>
      </p>
    </main>
    )

}
