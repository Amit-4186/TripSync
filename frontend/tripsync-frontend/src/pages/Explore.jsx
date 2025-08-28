import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

/**
 Explore main page:
 - GET /destinations (show grid)
 - allow quick "Create Trip" for a destination:
    * creates trip via POST /trips (title), then immediately PUT /trips/:id/destination with destinationId
 - after create, navigate to trip detail
 - also supports clicking a destination to open its places/rentals/templates (same as earlier)
**/

export default function Explore() {
  const [destinations, setDestinations] = useState([]);
  const [selectedDest, setSelectedDest] = useState(null);
  const [places, setPlaces] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [newTripName, setNewTripName] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { loadDestinations(); }, []);

  async function loadDestinations() {
    try {
      const res = await api.get("/destinations");
      setDestinations(res.data.data || []);
    } catch (e) { console.warn(e); setDestinations([]); }
  }

  async function openDestination(dest) {
    setSelectedDest(dest);
    try {
      const [pRes, rRes, tRes] = await Promise.all([
        api.get(`/destinations/${dest.id || dest._id}/places`),
        api.get(`/destinations/${dest.id || dest._id}/rentals`),
        api.get(`/destinations/${dest.id || dest._id}/templates`),
      ]);
      setPlaces(pRes.data.data || []);
      setRentals(rRes.data.data || []);
      setTemplates(tRes.data.data || []);
    } catch (e) {
      console.warn("open dest", e);
      setPlaces([]); setRentals([]); setTemplates([]);
    }
  }

  // create trip quickly then set destination
  async function quickCreateTrip(dest) {
    if (!newTripName.trim()) return alert("Enter trip name");
    setCreating(true);
    setErr(null);
    try {
      // POST /trips (title)
      const resCreate = await api.post("/trips", { title: newTripName });
      const trip = resCreate.data.data;
      // set destination
      await api.put(`/trips/${trip.id || trip._id}/destination`, { destinationId: dest.id || dest._id });
      // reload trip to ensure destination set
      // const resTrip = await api.get(`/trips/${trip.id || trip._id}`);
      // navigate to trip page
      window.location.href = `/app/trips/${trip.id || trip._id}`;
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to create trip");
    } finally { setCreating(false); }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 12 }}>
      <h2>Explore Destinations</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {destinations.map(d => (
          <div key={d.id || d._id} style={{ border: "1px solid #eee", padding: 10 }}>
            <h4>{d.name}</h4>
            <div style={{ fontSize: 13 }}>{d.description}</div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => openDestination(d)}>Explore</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>Create quick trip for a destination</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <select onChange={(e) => {
            const id = e.target.value;
            const dest = destinations.find(x => (x.id || x._id) === id);
            setSelectedDest(dest);
          }} defaultValue="">
            <option value="">Choose destination</option>
            {destinations.map(d => <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>)}
          </select>
          <input placeholder="Trip name" value={newTripName} onChange={e => setNewTripName(e.target.value)} />
          <button onClick={() => { if (!selectedDest) return alert("Choose destination"); quickCreateTrip(selectedDest); }} disabled={creating}>
            {creating ? "Creating..." : "Create Trip"}
          </button>
        </div>
        {err && <div style={{ color: "red" }}>{err}</div>}
      </div>

      {selectedDest && (
        <div style={{ marginTop: 24 }}>
          <h3>Selected: {selectedDest.name}</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <h4>Places</h4>
              {places.map(p => (
                <div key={p.id || p._id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                  <strong>{p.name}</strong> <small>({p.category})</small>
                  <div style={{ fontSize: 12 }}>{p.address}</div>
                </div>
              ))}
            </div>

            <div>
              <h4>Rentals</h4>
              {rentals.map(r => (
                <div key={r.id || r._id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                  <strong>{r.vendorName}</strong> <small>({r.type})</small>
                  <div style={{ fontSize: 12 }}>{r.contactPhone}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>Templates</h4>
            {templates.map(t => (
              <div key={t.id || t._id} style={{ border: "1px solid #eee", padding: 6, marginBottom: 6 }}>
                <strong>{t.title}</strong>
                <div style={{ fontSize: 13 }}>
                  {(t.steps || []).map(s => <div key={s.place}>{s.order}. {s.place?.name || s.place}</div>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ marginTop: 18 }}><Link to="/app">← Back to dashboard</Link></p>
    </div>
  );
}
