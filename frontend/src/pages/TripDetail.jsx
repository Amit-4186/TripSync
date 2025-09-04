// src/pages/TripDetail.jsx
import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import TripLiveMap from "../components/TripLiveMap";

import DestinationStep from "../components/trip-setup/DestinationStep.jsx";
import InviteStep from "../components/trip-setup/InviteStep.jsx";
import PlanStep from "../components/trip-setup/PlanStep.jsx";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { MapPin, ArrowBigLeft, ArrowLeft, ChevronLeft } from "lucide-react";

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [step, setStep] = useState(null);
  const [progress, setProgress] = useState(null);
  const [places, setPlaces] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [isInlineMap, setIsInlineMap] = useState(false);

  const loadTrip = useCallback(async () => {
    try {
      setErr(null);
      setLoading(true);
      const res = await api.get(`/trips/${id}`);
      const t = res.data?.data;
      setTrip(t || null);

      // Initial step Decision
      if (!t || !t.destination) {
        setStep(1);
      } else {
        const hasPlan = Array.isArray(t.planItems) && t.planItems.length > 0;

        if (!hasPlan) {
          setStep(3);
        } else {
          setStep(0);
          await Promise.all([
            loadProgress(),
            loadDestinationAssets(t.destination),
          ]);
        }
      }

    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load trip");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadPlan = useCallback(async () => {
    try {
      const res = await api.get(`/trips/${id}/plan`);
      // plan not stored here — we'll only need it inside final UI if you want
    } catch { }
  }, [id]);

  const loadProgress = useCallback(async () => {
    try {
      const res = await api.get(`/trips/${id}/progress`);
      setProgress(res.data?.data || null);
    } catch {
      setProgress(null);
    }
  }, [id]);

  async function loadDestinationAssets(destId) {
    if (!destId) return;
    try {
      const [pRes, rRes] = await Promise.all([
        api.get(`/destinations/${destId}/places`),
        api.get(`/destinations/${destId}/rentals`),
      ]);
      setPlaces(pRes.data?.data || []);
      setRentals(rRes.data?.data || []);
    } catch {
      setPlaces([]);
      setRentals([]);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadTrip();
  }, [id, loadTrip]);

  // callbacks passed to steps:
  const handleDestinationSet = async () => {
    // after dest is set, reload trip and move to invite step
    await loadTrip();
    setStep(2);
  };

  const handleInvitesCreated = async () => {
    // after invites, reload trip and move to plan step
    await loadTrip();
    setStep(3);
  };

  const handlePlanCompleted = async () => {
    // after plan created, reload everything and show final details
    await loadTrip();
    setStep(0);
    await loadProgress();
  };

  if (loading || step === null) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p>Loading trip…</p>
        <p className="mt-2">
          <Link to="/app" className="underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <p>Trip not found.</p>
        <p className="mt-2">
          <Link to="/app" className="underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  const amOwner = user?.id === (trip.owner?.id || trip.owner?._id || trip.owner);

  return (
    <div className="max-h-full mx-auto py-4 px-4 md:px-8">
      <ArrowLeft onClick={() => { navigate(-1) }} className="w-7 pt-2 h-full cursor-pointer hover:scale-110 stroke-gray-600 hover:stroke-black transition" strokeWidth={3} />
      <header className="mx-auto max-w-[800px] flex items-center justify-between px-3">
        <div>
          <h2 className="text-2xl md:text-4xl font-bold">
            {trip.title || "Untitled trip"}
          </h2>

          <p className="text-md text-muted-foreground mt-3">
            Status: <strong>{trip.status}</strong>
          </p>
        </div>
        <Badge variant="secondary" className="text-[20px] py-1 px-2">
          {step == 0 ? "" : "Step: " + step + "/3"}
        </Badge>
      </header>

      {isInlineMap && (
        <Card className="mb-4">
          <TripLiveMap tripId={id} />
        </Card>
      )}

      {/* SETUP WIZARD: only shown if step is 1/2/3 */}
      {step === 1 && (
        <DestinationStep tripId={id} onNext={handleDestinationSet} loading={loading} />
      )}

      {step === 2 && (
        <InviteStep tripId={id} onNext={handleInvitesCreated} />
      )}

      {/* {step === 3 && (
        <Card>
          <div className="space-y-4">
            <h3 className="font-semibold">Step 3 — Create trip plan</h3>
            <PlanStep tripId={id} destinationId={trip.destination} onFinish={handlePlanCompleted} />
          </div>
        </Card>
      )} */}

      {step === 3 && (
        <PlanStep tripId={id} destinationId={trip.destination} onFinish={handlePlanCompleted} />
      )}


      {/* FINAL DETAIL*/}
      {step === 0 && (
        <>
          <Card>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Members</h4>
                {(!trip.members || trip.members.length === 0) ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  trip.members.map((m) => (
                    <div key={m.user?.id || m.user} className="flex items-center justify-between p-2 border rounded-md mb-2">
                      <div>
                        <div className="font-medium">{m.user?.name || m.user?.email || m.user}</div>
                        <div className="text-xs text-muted-foreground">{m.role}</div>
                      </div>
                      {/* owner actions */}
                      {amOwner && m.role !== "owner" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={async () => {
                            if (!confirm("Make admin?")) return;
                            await api.post(`/trips/${id}/members/${m.user?.id || m.user}/role`, { role: "admin" });
                            await loadTrip();
                          }}>Make admin</Button>
                          <Button size="sm" variant="destructive" onClick={async () => {
                            if (!confirm("Remove member?")) return;
                            await api.delete(`/trips/${id}/members/${m.user?.id || m.user}`);
                            await loadTrip();
                          }}>Remove</Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Quick actions</h4>
                <div className="flex gap-2">
                  <Button onClick={() => setIsInlineMap(true)}>Show inline tracking</Button>
                  <Button variant="outline" onClick={() => window.alert("Share feature not implemented")}>Share</Button>
                </div>

                <div className="mt-4">
                  <h5 className="font-medium">Progress</h5>
                  <Progress value={progress ? Math.round((progress.visited / Math.max(progress.total, 1)) * 100) : 0} />
                  <div className="text-xs text-muted-foreground mt-1">
                    {progress ? `${progress.visited}/${progress.total} visited` : "No progress data"}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Timeline & Plan */}
          <Card>
            <h4 className="font-semibold mb-3">Timeline</h4>
            {trip.planItems?.length ? (
              <div className="space-y-4">
                {trip.planItems.map((item) => (
                  <div key={item.id || item._id} className="flex items-center justify-between border rounded-md p-3">
                    <div>
                      <div className="font-medium">{item.place?.name || item.place}</div>
                      <div className="text-xs text-muted-foreground">Day {item.day}</div>
                    </div>
                    <div className="flex gap-2">
                      {item.visitedAt ? (
                        <Button size="sm" variant="outline" onClick={async () => {
                          await api.post(`/trips/${id}/plan/${item.id || item._id}/unvisit`);
                          await loadTrip();
                          await loadProgress();
                        }}>Unmark</Button>
                      ) : (
                        <Button size="sm" onClick={async () => {
                          await api.post(`/trips/${id}/plan/${item.id || item._id}/visited`);
                          await loadTrip();
                          await loadProgress();
                        }}>Mark visited</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No plan yet.</p>
            )}
          </Card>
        </>
      )}

      {err && <p className="text-red-600 text-sm">{err}</p>}
    </div>
  );
}