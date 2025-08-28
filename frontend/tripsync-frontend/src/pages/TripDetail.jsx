import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

/*
Features:
- show trip basic info (GET /api/trips/:id)
- set destination (PUT /api/trips/:id/destination) - need /api/destinations list
- list templates for that destination (GET /api/destinations/:id/templates)
- create plan from template (POST /api/trips/:id/plan/from-template)
- custom plan builder: search places (GET /api/destinations/:id/places?q=...) and add steps then POST /api/trips/:id/plan/custom
- view plan (GET /api/trips/:id/plan)
- mark visited (POST /api/trips/:id/plan/:itemId/visited)
- unvisit (POST /api/trips/:id/plan/:itemId/unvisit)
- progress (GET /api/trips/:id/progress)
- create invites (POST /api/trips/:id/invites) -> shows dev links
*/

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [selectedDest, setSelectedDest] = useState("");
  const [templates, setTemplates] = useState([]);
  const [plan, setPlan] = useState([]);
  const [progress, setProgress] = useState(null);

  // custom plan builder state
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState([]);
  const [customSteps, setCustomSteps] = useState([]); // { placeId, day, note }

  // invites
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteLinks, setInviteLinks] = useState([]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!id) return;
    loadTrip();
    loadDestinations();
    loadProgress();
    loadPlan();
  }, [id]);

  async function loadTrip() {
    try {
      setErr(null);
      const res = await api.get(`/trips/${id}`);
      setTrip(res.data.data);
      if (res.data.data.destination) {
        setSelectedDest(res.data.data.destination);
        await loadTemplates(res.data.data.destination);
      }
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load trip");
    }
  }

  async function loadDestinations() {
    try {
      const res = await api.get("/destinations");
      setDestinations(res.data.data || []);
    } catch (e) {
      console.warn("Failed to load destinations:", e);
    }
  }

  async function loadTemplates(destId) {
    if (!destId) { setTemplates([]); return; }
    try {
      const res = await api.get(`/destinations/${destId}/templates`);
      setTemplates(res.data.data || []);
    } catch (e) {
      console.warn("Failed to load templates:", e);
    }
  }

  async function loadPlan() {
    try {
      const res = await api.get(`/trips/${id}/plan`);
      setPlan(res.data.data || []);
    } catch (e) {
      console.warn("No plan yet");
      setPlan([]);
    }
  }

  async function loadProgress() {
    try {
      const res = await api.get(`/trips/${id}/progress`);
      setProgress(res.data.data || null);
    } catch (e) {
      console.warn("No progress");
      setProgress(null);
    }
  }

  async function handleSetDestination(e) {
    e.preventDefault();
    if (!selectedDest) return;
    setLoading(true);
    try {
      await api.put(`/trips/${id}/destination`, { destinationId: selectedDest });
      await loadTrip();
      await loadTemplates(selectedDest);
      setCustomSteps([]);
      await loadPlan();
    } catch (err) {
      setErr(err.response?.data?.message || "Failed to set destination");
    } finally { setLoading(false); }
  }

  async function handleUseTemplate(templateId) {
    if (!templateId) return;
    setLoading(true);
    try {
      await api.post(`/trips/${id}/plan/from-template`, { templateId });
      await loadPlan();
      await loadProgress();
    } catch (err) {
      setErr(err.response?.data?.message || "Failed to apply template");
    } finally { setLoading(false); }
  }

  // search places in selectedDest
  async function handleSearchPlaces(e) {
    e.preventDefault();
    if (!selectedDest) { setErr("Set destination first"); return; }
    try {
      const res = await api.get(`/destinations/${selectedDest}/places`, { params: { q: placeQuery } });
      setPlaceResults(res.data.data || []);
    } catch (err) {
      setErr(err.response?.data?.message || "Search failed");
    }
  }

  function addStepFromPlace(place) {
    setCustomSteps(prev => [...prev, { place: place.id || place._id, day: 1, note: "" }]);
  }

  function reorderStep(index, dir) {
    setCustomSteps(prev => {
      const arr = [...prev];
      const newIndex = index + (dir === "up" ? -1 : 1);
      if (newIndex < 0 || newIndex >= arr.length) return arr;
      const tmp = arr[newIndex];
      arr[newIndex] = arr[index];
      arr[index] = tmp;
      return arr;
    });
  }

  async function submitCustomPlan() {
    if (!customSteps.length) { setErr("Add at least one place"); return; }
    setLoading(true);
    try {
      // transform steps to { place, day, note } (server calculates order)
      await api.post(`/trips/${id}/plan/custom`, { steps: customSteps });
      setCustomSteps([]);
      await loadPlan();
      await loadProgress();
    } catch (err) {
      setErr(err.response?.data?.message || "Failed to submit plan");
    } finally { setLoading(false); }
  }

  async function markVisited(itemId) {
    try {
      await api.post(`/trips/${id}/plan/${itemId}/visited`, {}); // optional send lat/lng
      await loadPlan();
      await loadProgress();
    } catch (e) { setErr(e.response?.data?.message || "Failed"); }
  }
  async function unvisit(itemId) {
    try {
      await api.post(`/trips/${id}/plan/${itemId}/unvisit`, {});
      await loadPlan();
      await loadProgress();
    } catch (e) { setErr(e.response?.data?.message || "Failed"); }
  }

  // simple create invites by emails (CSV)
  async function createInvites(e) {
    e.preventDefault();
    if (!inviteEmails.trim()) return;
    setLoading(true);
    try {
      const emails = inviteEmails.split(",").map(s => s.trim()).filter(Boolean);
      const res = await api.post(`/trips/${id}/invites`, { emails, expiresInMinutes: 1440 });
      // backend returns dev links
      setInviteLinks(res.data.data.map(x => x.link || (x.invite && x.invite.id)));
      setInviteEmails("");
    } catch (err) {
      setErr(err.response?.data?.message || "Failed to create invites");
    } finally { setLoading(false); }
  }

  if (!trip) {
    return (
      <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
        <p>Loading trip...</p>
        <p><Link to="/app">Back to dashboard</Link></p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: "18px auto", padding: 16 }}>
      <Link to="/app">← Back</Link>
      <h2>{trip.title || trip.name || "Untitled Trip"}</h2>
      <p>Owner: {trip.owner?.name || trip.owner}</p>
      <p>Status: {trip.status}</p>

      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Destination</h3>
        <form onSubmit={handleSetDestination}>
          <select value={selectedDest || ""} onChange={(e) => setSelectedDest(e.target.value)}>
            <option value="">— choose destination —</option>
            {destinations.map(d => <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>)}
          </select>
          <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>Set</button>
        </form>
        <small>Current destination: {trip.destination || "not set"}</small>
      </section>

      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Plan from Template</h3>
        {selectedDest ? (
          templates.length === 0 ? <p>No templates for this destination</p> :
            (<ul>{templates.map(t => (
              <li key={t.id || t._id}>
                <strong>{t.title}</strong>
                <button onClick={() => handleUseTemplate(t.id || t._id)} style={{ marginLeft: 8 }}>Use</button>
              </li>
            ))}</ul>)
        ) : <p>Set a destination to see templates.</p>}
      </section>

      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Custom Plan Builder (search places)</h3>
        <form onSubmit={handleSearchPlaces} style={{ display: "flex", gap: 8 }}>
          <input value={placeQuery} onChange={(e) => setPlaceQuery(e.target.value)} placeholder="search places by name or tag" />
          <button type="submit">Search</button>
        </form>
        <div>
          {placeResults.map(p => (
            <div key={p.id || p._id} style={{ marginTop: 8, border: "1px solid #eee", padding: 8 }}>
              <div><strong>{p.name}</strong> <em>({p.category})</em></div>
              <div style={{ fontSize: 12 }}>{p.address}</div>
              <button onClick={() => addStepFromPlace(p)} style={{ marginTop: 8 }}>Add to plan</button>
            </div>
          ))}
        </div>

        <h4>Planned steps (local)</h4>
        {customSteps.length === 0 ? <p>No custom steps</p> : (
          <ul>
            {customSteps.map((s, idx) => (
              <li key={idx}>
                {s.place} (day {s.day}) <button onClick={() => reorderStep(idx, "up")}>↑</button> <button onClick={() => reorderStep(idx, "down")}>↓</button>
              </li>
            ))}
          </ul>
        )}
        <button onClick={submitCustomPlan} disabled={loading || customSteps.length === 0}>Submit Custom Plan</button>
      </section>

      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Plan</h3>
        {plan.length === 0 ? <p>No plan yet</p> : (
          <ol>
            {plan.map(item => (
              <li key={item._id || item.id} style={{ marginBottom: 6 }}>
                <div><strong>{item.place?.name || item.place}</strong> — Day {item.day} — Order {item.order}</div>
                <div>Visited: {item.visitedAt ? new Date(item.visitedAt).toLocaleString() : "No"}</div>
                <div>
                  <button onClick={() => markVisited(item._id || item.id)}>Mark visited</button>
                  <button onClick={() => unvisit(item._id || item.id)} style={{ marginLeft: 8 }}>Unvisit</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Progress</h3>
        {progress ? (
          <div>
            <div>Total: {progress.total}</div>
            <div>Visited: {progress.visited}</div>
            <div>Pending: {progress.pending}</div>
            <div>Next: {progress.nextItem ? (progress.nextItem.place?.name || progress.nextItem.place) : "None"}</div>
          </div>
        ) : <p>No progress data</p>}
      </section>

      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Create Invites (owner/admin)</h3>
        <p>Enter comma-separated emails (dev link will be returned)</p>
        <form onSubmit={createInvites}>
          <input value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} placeholder="a@x.com, b@y.com" style={{ width: 420 }} />
          <button type="submit" disabled={loading} style={{ marginLeft: 8 }}>Create</button>
        </form>
        <div>
          {inviteLinks.length > 0 && (
            <div>
              <h4>Dev links (copy & share)</h4>
              <ul>
                {inviteLinks.map((l, i) => <li key={i}><a href={l}>{l}</a></li>)}
              </ul>
            </div>
          )}
        </div>
      </section>

      {err && <p style={{ color: "red" }}>{err}</p>}
    </div>
  );
}
