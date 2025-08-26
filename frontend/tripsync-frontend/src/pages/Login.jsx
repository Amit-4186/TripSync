import { useState } from "react"; 
import { useNavigate, Link } from "react-router-dom"; 
import { useAuth } from "../context/AuthContext"; 
export default function Login() { 
  const { login } = useAuth(); 
  const navigate = useNavigate(); 
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [err, setErr] = useState(null); 
  const [loading, setLoading] = useState(false); 
  const onSubmit = async (e) => { 
    e.preventDefault(); 
    setErr(null); 
    setLoading(true); 
    try { 
      await login(email, password); 
      navigate("/app", { replace: true }); 
    } catch (e) { 
      setErr(e.response?.data?.message || "Login failed"); 
    } finally { 
      setLoading(false); 
    } 
  }; 
  return ( 
    <div style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}> 
      <h1>TripSync — Login</h1> 
      <form onSubmit={onSubmit}> 
        <div> 
          <label>Email</label><br/> 
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" 
required /> 
        </div> 
        <div style={{ marginTop: 8 }}> 
          <label>Password</label><br/> 
          <input value={password} onChange={(e) => setPassword(e.target.value)} 
type="password" required /> 
        </div> 
        {err && <p style={{ color: "red" }}>{err}</p>} 
        <button type="submit" disabled={loading} style={{ marginTop: 12 }}> 
          {loading ? "Logging in..." : "Login"} 
        </button> 
      </form> 
      <p style={{ marginTop: 12 }}> 
        No account? <Link to="/register">Register</Link> 
      </p> 
    </div> 
  );
}