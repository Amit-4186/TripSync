import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import TripLiveMap from "../components/TripLiveMap";

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

  // New states
  const [selectedNewOwner, setSelectedNewOwner] = useState("");
  const [places, setPlaces] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [placeFilterQ, setPlaceFilterQ] = useState("");
  const [placeCategory, setPlaceCategory] = useState("");
  const [rentalType, setRentalType] = useState("");
  const [joinCode, setJoinCode] = useState(null);
  const [showTrackingInline, setShowTrackingInline] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const loadTrip = useCallback(async () => {
    try {
      setErr(null);
      const res = await api.get(`/trips/${id}`);
      const t = res.data.data;
      setTrip(t);
      setSelectedDest(t.destination || "");
      setJoinCode(t.joinCode || "");

      if (t.destination) {
        await loadTemplates(t.destination);
        loadDestinationAssets(t.destination);
      }
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load trip");
    }
  }, [id])

  const loadDestinations = useCallback(async () => {
    try {
      const res = await api.get("/destinations");
      setDestinations(res.data.data || []);
    } catch (e) {
      console.warn("Failed to load destinations:", e);
    }
  }, [])

  const loadPlan = useCallback(async () => {
    try {
      const res = await api.get(`/trips/${id}/plan`);
      setPlan(res.data.data || []);
    } catch (e) {
      console.warn("No plan yet");
      setPlan([]);
    }
  }, [id])

  const loadProgress = useCallback(async () => {
    try {
      const res = await api.get(`/trips/${id}/progress`);
      setProgress(res.data.data || null);
    } catch (e) {
      console.warn("No progress");
      setProgress(null);
    }
  }, [id])

  useEffect(() => {
    if (!id) return;
    loadTrip();
    loadDestinations();
    loadProgress();
    loadPlan();
  }, [loadPlan, loadDestinations, loadProgress, loadTrip, id]);

  async function loadDestinationAssets(destinationId) {
    try {
      const [pRes, rRes] = await Promise.all([
        api.get(`/destinations/${destinationId}/places`),
        api.get(`/destinations/${destinationId}/rentals`),
      ]);
      setPlaces(pRes.data.data || []);
      setRentals(rRes.data.data || []);
    } catch (e) {
      console.warn("Failed to load destination assets", e);
      setPlaces([]);
      setRentals([]);
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
      await api.post(`/trips/${id}/plan/${itemId}/visited`, {}); // optionally send lat/lng
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

  async function startTrip() {
    setLoading(true);
    try {
      await api.post(`/trips/${id}/start`);
      await loadTrip();
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to start trip");
    } finally { setLoading(false); }
  }

  async function completeTrip() {
    setLoading(true);
    try {
      await api.post(`/trips/${id}/complete`);
      await loadTrip();
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to complete trip");
    } finally { setLoading(false); }
  }

  async function leaveTrip() {
    if (!window.confirm("Are you sure you want to leave this trip?")) return;
    setLoading(true);
    try {
      await api.post(`/trips/${id}/leave`);
      navigate("/app");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to leave trip");
    } finally { setLoading(false); }
  }

  async function transferOwnership() {
    if (!selectedNewOwner) return alert("Select a member to transfer ownership to");
    if (!window.confirm("Transfer ownership? You will become admin.")) return;
    setLoading(true);
    try {
      await api.post(`/trips/${id}/transfer-ownership`, { toUserId: selectedNewOwner });
      await loadTrip();
      alert("Ownership transferred");
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to transfer ownership");
    } finally { setLoading(false); }
  }

  async function kickMember(memberUserId) {
    if (!window.confirm("Remove this member from trip?")) return;
    setLoading(true);
    try {
      await api.delete(`/trips/${id}/members/${memberUserId}`);
      await loadTrip();
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to remove member");
    } finally { setLoading(false); }
  }

  async function rotateJoinCode() {
    if (!window.confirm("Rotate join code? Old code will stop working.")) return;
    setLoading(true);
    try {
      const res = await api.post(`/trips/${id}/rotate-join-code`);
      const code = (res.data && res.data.data && res.data.data.joinCode) ? res.data.data.joinCode : null;
      setJoinCode(code);
      await loadTrip();
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to rotate code");
    } finally { setLoading(false); }
  }

  function doPlaceFilterAndSort() {
    let out = [...places];
    if (placeCategory) out = out.filter(p => p.category === placeCategory);
    if (placeFilterQ) {
      const q = placeFilterQ.toLowerCase();
      out = out.filter(p => (p.name || "").toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    return out.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  async function filterRentals() {
    try {
      const destId = trip?.destination;
      if (!destId) return;
      const res = await api.get(`/destinations/${destId}/rentals`, { params: rentalType ? { type: rentalType } : {} });
      setRentals(res.data.data || []);
    } catch (e) { console.warn(e); }
  }

  if (!trip) {
    return (
      <div style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
        <p>Loading trip...</p>
        <p><Link to="/app">Back to dashboard</Link></p>
      </div>
    );
  }

  const isOwner = trip.members?.some(m => (m.user && (m.user.id || m.user._id || m.user)) === (trip.owner || (trip.owner.id || trip.owner)));
  const amOwner = trip.owner && (user?.id === trip.owner || user?.id === (trip.owner?.id || trip.owner?._id || trip.owner));

  return (
    <div style={{ maxWidth: 1000, margin: "18px auto", padding: 16 }}>
      <Link to="/app">← Back</Link>
      <h2>{trip.title || trip.name || "Untitled Trip"}</h2>
      <div style={{ marginTop: 12 }}>
        <button onClick={() => setShowTrackingInline(v => !v)}>
          {showTrackingInline ? "Hide live tracking" : "Show live tracking"}
        </button>
        <button onClick={() => navigate(`/app/trips/${id}/track`)} style={{ marginLeft: 8 }}>
          Open tracking in full page
        </button>
      </div>

      {showTrackingInline && (
        <div style={{ marginTop: 12 }}>
          <TripLiveMap tripId={id} />
        </div>
      )}

      <p>Owner: {trip.owner?.name || trip.owner}</p>
      <p>Status: {trip.status}</p>
      <p>Join code: {joinCode || "—"} {(amOwner || isOwner) && <button onClick={rotateJoinCode} style={{ marginLeft: 8 }}>Rotate</button>}</p>

      {/* New Trip Lifecycle Section */}
      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Trip Lifecycle</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {trip.status !== "active" && (amOwner || isOwner) && <button onClick={startTrip} disabled={loading}>Start Trip</button>}
          {trip.status === "active" && (amOwner || isOwner) && <button onClick={completeTrip} disabled={loading}>Complete Trip</button>}
          <button onClick={leaveTrip} disabled={loading} style={{ marginLeft: 8 }}>Leave Trip</button>
        </div>
      </section>

      {/* New Members Section */}
      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Members</h3>
        {(!trip.members || trip.members.length === 0) ? <p>No members</p> : (
          <ul>
            {trip.members.map(m => {
              const userObj = m.user && (typeof m.user === "object" ? (m.user.id ? { id: m.user.id, name: m.user.name, email: m.user.email } : { id: m.user._id, name: m.user.name, email: m.user.email }) : { id: m.user });
              const me = user && (user.id === userObj.id || user.id === userObj._id);
              return (
                <li key={userObj.id || userObj._id || userObj}>
                  <strong>{userObj.name || userObj.email || userObj.id}</strong>
                  {" "}({m.role}) {me && " — you"}
                  {(amOwner || isOwner) && m.role !== "owner" && (
                    <button onClick={() => kickMember(userObj.id || userObj._id || userObj)} style={{ marginLeft: 8 }}>Remove</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {(amOwner || isOwner) && (
          <div style={{ marginTop: 8 }}>
            <h4>Transfer ownership</h4>
            <select value={selectedNewOwner} onChange={(e) => setSelectedNewOwner(e.target.value)}>
              <option value="">— select member —</option>
              {trip.members.filter(m => m.role !== "owner").map(m => {
                const uid = m.user && (m.user.id || m.user._id || m.user);
                const label = m.user && (m.user.name || m.user.email || uid);
                return <option key={uid} value={uid}>{label} ({m.role})</option>;
              })}
            </select>
            <button onClick={transferOwnership} style={{ marginLeft: 8 }}>Transfer</button>
          </div>
        )}
      </section>

      {/* Original Destination Section */}
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

      {/* New Explore Section */}
      <section style={{ borderTop: "1px solid #ddd", paddingTop: 12, marginTop: 12 }}>
        <h3>Explore (places & rentals for this trip destination)</h3>
        {!trip.destination ? (
          <p>No destination set for trip. Set a destination first.</p>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <input placeholder="search places/tags" value={placeFilterQ} onChange={e => setPlaceFilterQ(e.target.value)} />
              <select value={placeCategory} onChange={e => setPlaceCategory(e.target.value)} style={{ marginLeft: 8 }}>
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
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <h4>Places</h4>
                {doPlaceFilterAndSort().length === 0 ? <p>No places</p> : doPlaceFilterAndSort().map(p => (
                  <div key={p.id || p._id} style={{ border: "1px solid #eee", padding: 8, marginBottom: 8 }}>
                    <div><strong>{p.name}</strong> ({p.category})</div>
                    <div style={{ fontSize: 12 }}>{p.address}</div>
                    <div style={{ fontSize: 12 }}>Tags: {(p.tags || []).join(", ")}</div>
                    <div style={{ fontSize: 12 }}>Rating: {p.rating || "-"}</div>
                  </div>
                ))}
              </div>

              <div>
                <h4>Rentals</h4>
                <div style={{ marginBottom: 8 }}>
                  <select value={rentalType} onChange={e => setRentalType(e.target.value)}>
                    <option value="">All types</option>
                    <option value="car">car</option>
                    <option value="bike">bike</option>
                    <option value="scooter">scooter</option>
                  </select>
                  <button onClick={filterRentals} style={{ marginLeft: 8 }}>Apply</button>
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
          </>
        )}
      </section>

      {/* Original Template Section */}
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

      {/* Original Custom Plan Builder Section */}
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

      {/* Original Plan Section */}
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

      {/* Original Progress Section */}
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

      {/* Original Invites Section */}
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