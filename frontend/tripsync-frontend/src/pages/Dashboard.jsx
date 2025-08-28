import { useEffect, useState } from "react"; 
import api from "../lib/api"; 
import { Link } from "react-router-dom"; 
import { useAuth } from "../context/AuthContext"; 
export default function Dashboard() { 
  const { user, logout } = useAuth(); 
  const [trips, setTrips] = useState([]); 
  const [name, setName] = useState(""); 
  const [startDate, setStartDate] = useState(""); 
  const [endDate, setEndDate] = useState(""); 
  const [loading, setLoading] = useState(false); 
  const [err, setErr] = useState(null); 
  const loadTrips = async () => { 
    try { 
      const { data } = await api.get("/trips"); 
      setTrips(data.data || []); 
    } catch (e) { 
      setErr(e.response?.data?.message || "Failed to load trips"); 
    } 
  }; 
  useEffect(() => { loadTrips(); }, []); 
  const onCreate = async (e) => { 
    e.preventDefault(); 
    setLoading(true); 
    try { 
      const { data } = await api.post("/trips", {
        title: name,   
        startDate: startDate || undefined,
        endDate: endDate || undefined
});
      setTrips((prev) => [data.data, ...prev]); 
      setName(""); 
      setStartDate(""); 
      setEndDate(""); 
    } catch (e) { 
      setErr(e.response?.data?.message || "Create trip failed"); 
    } finally { 
      setLoading(false); 
    } 
  }; 
  return ( 
    <div style={{ maxWidth: 800, margin: "24px auto", padding: 16 }}> 
      <header style={{ display: "flex", justifyContent: "space-between" }}> 
        <h2>Welcome, {user?.name}</h2> 
        <button onClick={logout}>Logout</button> 
      </header> 
      <section style={{ marginTop: 16 }}> 
        <h3>Create Trip</h3> 
        <form onSubmit={onCreate} style={{ display: "grid", gap: 8, maxWidth: 520 }}> 
          <input placeholder="Trip name" value={name} onChange={(e) => 
setName(e.target.value)} required /> 
          <div style={{ display: "flex", gap: 8 }}> 
            <div> 
              <label>Start</label><br />
              <input type="date" value={startDate} onChange={(e) => 
setStartDate(e.target.value)} /> 
            </div> 
            <div> 
              <label>End</label><br /> 
              <input type="date" value={endDate} onChange={(e) => 
setEndDate(e.target.value)} /> 
            </div> 
          </div> 
          <button type="submit" disabled={loading}>{loading ? "Creating..." : 
"Create"}</button> 
        </form> 
        {err && <p style={{ color: "red" }}>{err}</p>} 
      </section> 
      <section style={{ marginTop: 24 }}> 
        <h3>Your Trips</h3> 
        {trips.length === 0 ? ( 
          <p>No trips yet.</p> 
        ) : ( 
          <ul> 
            {trips.map((t) => ( 
              <li key={t.id}> 
                <Link to={`/app/trips/${t.id}`}>{t.title}</Link> 
              </li> 
            ))} 
          </ul> 
        )} 
      </section> 
    </div> 
  ); 
}