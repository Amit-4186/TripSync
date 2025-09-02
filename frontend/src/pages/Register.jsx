import { useState } from "react"; 
import { useNavigate, Link } from "react-router-dom"; 
import { useAuth } from "../context/AuthContext"; 
export default function Register() { 
  const { register } = useAuth(); 
  const navigate = useNavigate(); 
  const [name, setName] = useState(""); 
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [err, setErr] = useState(null); 
  const [loading, setLoading] = useState(false); 
  const onSubmit = async (e) => { 
    e.preventDefault(); 
    setErr(null); 
    setLoading(true); 
    try { 
      await register(name, email, password); 
      navigate("/app", { replace: true }); 
    } catch (e) { 
      setErr(e.response?.data?.message || "Registration failed"); 
    } finally { 
      setLoading(false); 
    } 
  }; 
  return ( 
    <div style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}> 
      <h1>TripSync — Register</h1> 
      <form onSubmit={onSubmit}> 
        <div> 
          <label>Name</label><br/> 
          <input value={name} onChange={(e) => setName(e.target.value)} required /> 
        </div> 
        <div style={{ marginTop: 8 }}> 
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
          {loading ? "Creating..." : "Create account"} 
        </button> 
      </form> 
<p style={{ marginTop: 12 }}> 
Have an account? <Link to="/login">Login</Link> 
</p> 
</div> 
); 
}