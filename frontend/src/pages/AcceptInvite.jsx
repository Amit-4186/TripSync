import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const accept = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.post(`/trips/invites/${token}/accept`);
      setStatus(res.data.message || "Joined the trip");
      setTimeout(() => navigate("/app"), 1500);
    } catch (e) {
      setStatus(e.response?.data?.message || "Failed to accept");
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) {
      setStatus("No token provided in URL");
      return;
    }
    if (isAuthenticated) {
      accept();
    } else {
      setStatus(
        "Please login to accept this invite. After login re-open this link or navigate here again."
      );
    }
  }, [token, isAuthenticated, accept]);

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 12 }}>
      <h2>Trip Invite</h2>
      <p>Token: {token}</p>
      <p>Status: {status || "waiting..."}</p>
      {!isAuthenticated && (
        <p>
          <Link to="/login">Login</Link> to accept the invite.
        </p>
      )}
      {isAuthenticated && !loading && (
        <p>
          You are logged in. If it did not auto-accept,{" "}
          <button onClick={accept}>Accept invite</button>
        </p>
      )}
      <p>
        <Link to="/app">Back to app</Link>
      </p>
    </div>
  );
}
