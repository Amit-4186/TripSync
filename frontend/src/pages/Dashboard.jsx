import { useEffect, useState } from "react";
import api from "../lib/api";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("myTrips");
  const [loading, setLoading] = useState(false);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [err, setErr] = useState(null);

  const loadTrips = async () => {
    try {
      const { data } = await api.get("/trips");
      setTrips(data.data || []);
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load trips");
    }
  };

  const loadDestinations = async () => {
    setDestinationsLoading(true);
    try {
      const { data } = await api.get("/destinations");
      if (data.success) {
        setDestinations(data.data);
      } else {
        setErr("Failed to load destinations: Invalid response format");
      }
    } catch (e) {
      console.error("Failed to load destinations:", e);
      setErr("Failed to load destinations. Check console for details.");
    } finally {
      setDestinationsLoading(false);
    }
  };

  const handleExploreDestination = (destinationId) => {
    navigate(`/app/explore/${destinationId}`);
  };

  useEffect(() => {
    loadTrips();
    loadDestinations();
  }, []);

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

    <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2>Welcome, {user?.name}</h2>
        <button
          onClick={logout}
          style={{
            padding: "8px 16px",
            backgroundColor: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Logout
        </button>
      </header>

      {/* Tab Navigation */}
      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab("myTrips")}
          style={{
            padding: "8px 16px",
            backgroundColor: activeTab === "myTrips" ? "#3b82f6" : "transparent",
            color: activeTab === "myTrips" ? "white" : "#4b5563",
            border: "none",
            borderRadius: "6px 6px 0 0",
            cursor: "pointer",
            marginRight: 8
          }}
        >
          My Trips
        </button>
        <button
          onClick={() => setActiveTab("explore")}
          style={{
            padding: "8px 16px",
            backgroundColor: activeTab === "explore" ? "#3b82f6" : "transparent",
            color: activeTab === "explore" ? "white" : "#4b5563",
            border: "none",
            borderRadius: "6px 6px 0 0",
            cursor: "pointer"
          }}
        >
          Explore Destinations
        </button>
      </div>

      {activeTab === "myTrips" ? (
        <>
          <section style={{ marginBottom: 32 }}>
            <h3 style={{ marginBottom: 16 }}>Create New Trip</h3>
            <form onSubmit={onCreate} style={{ display: "grid", gap: 12, maxWidth: 520, padding: 16, border: "1px solid #e5e7eb", borderRadius: 8 }}>
              <input
                placeholder="Trip name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
              />
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 4, width: "100%" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 4, width: "100%" }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: "10px 16px",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1
                }}
              >
                {loading ? "Creating..." : "Create Trip"}
              </button>
            </form>
            {err && <p style={{ color: "red", marginTop: 8 }}>{err}</p>}
          </section>

          <section>
            <h3 style={{ marginBottom: 16 }}>Your Trips</h3>
            {trips.length === 0 ? (
              <p style={{ color: "#6b7280", fontStyle: "italic" }}>No trips yet. Create your first trip!</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
                {trips.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: 16,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      backgroundColor: "white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}
                  >
                    <h4 style={{ margin: "0 0 8px 0" }}>{t.title}</h4>
                    <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: 14 }}>
                      {t.startDate && new Date(t.startDate).toLocaleDateString()}
                      {t.endDate && ` - ${new Date(t.endDate).toLocaleDateString()}`}
                    </p>
                    <Link
                      to={`/app/trips/${t.id}`}
                      style={{
                        display: "inline-block",
                        padding: "6px 12px",
                        backgroundColor: "#f3f4f6",
                        color: "#374151",
                        textDecoration: "none",
                        borderRadius: 4,
                        fontSize: 14
                      }}
                    >
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : (
        <section>
          <h3 style={{ marginBottom: 16 }}>Famous Tourism Destinations</h3>
          {destinationsLoading ? (
            <p style={{ color: "#6b7280", fontStyle: "italic" }}>Loading destinations...</p>
          ) : destinations.length === 0 ? (
            <p style={{ color: "#6b7280", fontStyle: "italic" }}>
              No destinations found. {err && <span style={{ color: "red" }}>(Error: {err})</span>}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
              {destinations.map((d) => {

                return (
                  <div
                    key={d.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      overflow: "hidden",
                      backgroundColor: "white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                    }}
                  >
                    {d.coverImage && (
                      <img
                        src={d.coverImage}
                        alt={d.name}
                        style={{ width: "100%", height: 160, objectFit: "cover" }}
                      />
                    )}
                    <div style={{ padding: 16 }}>
                      <h4 style={{ margin: "0 0 8px 0" }}>{d.name}</h4>
                      <p style={{ margin: "0 0 12px 0", color: "#6b7280", fontSize: 14 }}>
                        {d.description || "Explore this beautiful destination"}
                      </p>
                      <button
                        onClick={() => handleExploreDestination(d.id)}
                        style={{
                          padding: "6px 12px",
                          backgroundColor: "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 14,
                          width: "100%"
                        }}
                      >
                        Explore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
