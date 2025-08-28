import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

/*
Features:
- list destinations (GET /destinations)
- when destination selected, list places with filter category, tag, q (GET /destinations/:id/places)
- support sorting by name or rating (client side)
- list rentals (GET /destinations/:id/rentals?type=)
- list templates (GET /destinations/:id/templates)
*/

export default function Explore() {
  const [destinations, setDestinations] = useState([]);
  const [selectedDest, setSelectedDest] = useState(null);
  const [places, setPlaces] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name"); // or rating
  const [typeRental, setTypeRental] = useState("");

  useEffect(() => { loadDestinations(); }, []);

  async function loadDestinations() {
    try {
      const res = await api.get("/destinations");
      setDestinations(res.data.data || []);
    } catch (e) { console.warn(e); }
  }

  async function selectDestination(dest) {
    setSelectedDest(dest);
    setCategory("");
    setTag("");
    setQ("");
    setSort("name");
    // fetch places, rentals, templates
    await loadPlaces(dest.id || dest._id, { category: "", tag: "", q: "" });
    await loadRentals(dest.id || dest._id, {});
    await loadTemplates(dest.id || dest._id);
  }

  async function loadPlaces(destId, params = {}) {
    try {
      const res = await api.get(`/destinations/${destId}/places`, { params });
      setPlaces(res.data.data || []);
    } catch (e) { console.warn("places", e); setPlaces([]); }
  }

  async function loadRentals(destId, params = {}) {
    try {
      const res = await api.get(`/destinations/${destId}/rentals`, { params });
      setRentals(res.data.data || []);
    } catch (e) { console.warn("rentals", e); setRentals([]); }
  }

  async function loadTemplates(destId) {
    try {
      const res = await api.get(`/destinations/${destId}/templates`);
      setTemplates(res.data.data || []);
    } catch (e) { console.warn("templates", e); setTemplates([]); }
  }

  function applyFilters() {
    if (!selectedDest) return;
    loadPlaces(selectedDest.id || selectedDest._id, { category: category || undefined, tag: tag || undefined, q: q || undefined });
  }

  // client-side sort
  const sortedPlaces = [...places].sort((a,b) => {
    if (sort === "name") return (a.name||"").localeCompare(b.name||"");
    if (sort === "rating") return (b.rating||0) - (a.rating||0);
    return 0;
  });

  return (
    <div style={{ maxWidth: 1000, margin: "20px auto", padding: 12 }}>
      <h2>Explore Destinations</h2>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 260 }}>
          <h4>All Destinations</h4>
          <ul>
            {destinations.map(d => (
              <li key={d.id || d._id}>
                <button style={{ background: "none", border: "none", cursor: "pointer", textDecoration: selectedDest && (selectedDest.id||selectedDest._id) === (d.id||d._id) ? "underline" : "none" }} onClick={() => selectDestination(d)}>
                  {d.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ flex: 1 }}>
          {selectedDest ? (
            <>
              <h3>{selectedDest.name}</h3>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input placeholder="search" value={q} onChange={(e)=>setQ(e.target.value)} />
                <input placeholder="tag" value={tag} onChange={(e)=>setTag(e.target.value)} />
                <select value={category} onChange={(e)=>setCategory(e.target.value)}>
                  <option value="">All categories</option>
                  <option value="sightseeing">sightseeing</option>
                  <option value="cafe">cafe</option>
                  <option value="restaurant">restaurant</option>
                  <option value="nature">nature</option>
                  <option value="adventure">adventure</option>
                  <option value="museum">museum</option>
                  <option value="hostel">hostel</option>
                  <option value="hotel">hotel</option>
                </select>
                <button onClick={applyFilters}>Apply</button>
                <select value={sort} onChange={(e)=>setSort(e.target.value)}>
                  <option value="name">Sort: name</option>
                  <option value="rating">Sort: rating</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <h4>Places</h4>
                  {sortedPlaces.length === 0 ? <p>No places</p> : sortedPlaces.map(p => (
                    <div key={p.id || p._id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                      <div><strong>{p.name}</strong> ({p.category})</div>
                      <div style={{ fontSize: 12 }}>{p.address}</div>
                      <div style={{ fontSize: 12 }}>Rating: {p.rating || "-"}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <h4>Rentals</h4>
                  <div style={{ marginBottom: 8 }}>
                    <select value={typeRental} onChange={(e)=>setTypeRental(e.target.value)}>
                      <option value="">All types</option>
                      <option value="car">car</option>
                      <option value="bike">bike</option>
                      <option value="scooter">scooter</option>
                    </select>
                    <button onClick={() => loadRentals(selectedDest.id || selectedDest._id, { type: typeRental })} style={{ marginLeft: 8 }}>Filter</button>
                  </div>
                  {rentals.length === 0 ? <p>No rentals</p> : rentals.map(r => (
                    <div key={r.id || r._id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                      <div><strong>{r.vendorName}</strong> ({r.type})</div>
                      <div style={{ fontSize: 12 }}>{r.contactPhone}</div>
                      <div style={{ fontSize: 12 }}>Price/day: {r.pricePerDay}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <h4>Templates</h4>
                {templates.length === 0 ? <p>No templates</p> : templates.map(t => (
                  <div key={t.id || t._id} style={{ border: "1px solid #eee", padding: 6, marginBottom: 6 }}>
                    <strong>{t.title}</strong>
                    <div style={{ fontSize: 13 }}>
                      {t.steps?.map(s => <div key={s.place}>{s.order}. {s.place?.name || s.place}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : <p>Select a destination to explore places, rentals and templates.</p>}
        </div>
      </div>
      <p><Link to="/app">← Back to dashboard</Link></p>
    </div>
  );
}
