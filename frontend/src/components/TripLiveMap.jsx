import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { io } from "socket.io-client";

import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl: markerIconUrl,
    shadowUrl: markerShadowUrl,
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    iconSize: [25, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function FlyTo({ latlng }) {
    const map = useMap();
    useEffect(() => {
        if (!latlng) return;
        map.flyTo(latlng, 13, { duration: 0.8 });
    }, [latlng, map]);
    return null;
}

export default function TripLiveMap({ tripId: propTripId }) {
    const params = useParams();
    const tripId = propTripId || params.id;
    const { user } = useAuth();
    const navigate = useNavigate();

    const [trip, setTrip] = useState(null);
    const [locations, setLocations] = useState({});
    const [sharing, setSharing] = useState(false);
    const [err, setErr] = useState(null);
    const [centerOn, setCenterOn] = useState(null);

    const socketRef = useRef(null);
    const watchIdRef = useRef(null);

    const apiUrl = api.defaults?.baseURL || window.location.origin;
    const urlObj = new URL(apiUrl);
    const wsUrl = process.env.REACT_APP_WS_URL || `${urlObj.origin}`;

    useEffect(() => {
        console.log("wsurl: ", wsUrl)
        async function _load() {
            try {
                const res = await api.get(`/trips/${tripId}`);
                setTrip(res.data.data);
            } catch (e) {
                console.warn("Could not load trip:", e);
            }
        }
        if (tripId) _load();
    }, [tripId, wsUrl]);

    // load cached last-known locations
    const loadLastLocations = useCallback(async () => {
        try {
            const res = await api.get(`/trips/${tripId}/locations`);
            setLocations(res.data.data || {});
            const myLoc = res.data.data && res.data.data[user?.id];
            if (myLoc) setCenterOn([myLoc.lat, myLoc.lng]);
        } catch (e) {
            console.warn("Failed to load last locations", e);
        }
    }, [tripId, user?.id]);

    // socket connect
    useEffect(() => {
        if (!tripId) return;
        // getting token from api defaults or localStorage
        let token;
        try {
            token = localStorage.getItem("ts_access_token");
            console.log("token: ", token)
        } catch (e) {
            token = localStorage.getItem("token");
        }

        const socket = io(wsUrl, {
            transports: ["websocket"],
            auth: token ? { token } : {},
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("socket connected", socket.id);
            socket.emit("joinTrip", { tripId, userId: user?.id });
        });

        socket.on("locationUpdate", (payload) => {
            if (!payload || !payload.userId) return;
            setLocations(prev => ({ ...prev, [payload.userId]: payload.location }));
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connect_error", err);
            setErr("Realtime connection failed");
        });

        socket.on("error", (e) => {
            console.error("Socket error", e);
        });

        return () => {
            try {
                socket.disconnect();
            } catch (e) { }
            socketRef.current = null;
        };
    }, [tripId, user?.id, wsUrl]);

    // start/stop location sharing
    const startSharing = useCallback(() => {
        if (!("geolocation" in navigator)) {
            setErr("Geolocation not supported");
            return;
        }
        if (!socketRef.current) {
            setErr("Realtime not connected yet");
            return;
        }

        const id = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const loc = { lat, lng, ts: Date.now() };
                setLocations(prev => ({ ...prev, [user.id]: loc }));
                socketRef.current.emit("sendLocation", { tripId, userId: user.id, location: { lat, lng } });
            },
            (error) => {
                console.warn("geolocation error", error);
                setErr("Failed to obtain location — check permissions.");
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );

        watchIdRef.current = id;
        setSharing(true);
        setErr(null);
    }, [tripId, user?.id]);

    const stopSharing = useCallback(() => {
        if (watchIdRef.current !== null) {
            try {
                navigator.geolocation.clearWatch(watchIdRef.current);
            } catch (e) { }
            watchIdRef.current = null;
        }
        setSharing(false);
    }, []);

    useEffect(() => {
        if (!tripId) return;
        loadLastLocations();
        return () => {
            stopSharing();
        };
    }, [tripId, loadLastLocations, stopSharing]);

    const members = (trip?.members || []).map(m => {
        const uid = (m.user && (m.user.id || m.user._id || m.user)) || String(m._id || m.user);
        const name = (m.user && (m.user.name || m.user.email)) || `Member ${uid}`;
        return { id: uid, name };
    });

    const fallbackCenter = (() => {
        const mine = locations[user?.id];
        if (mine) return [mine.lat, mine.lng];
        const first = Object.values(locations)[0];
        if (first) return [first.lat, first.lng];
        return [20.5937, 78.9629];
    })();

    // for testing purposes
    const simulateSend = () => {
        if (!socketRef.current) { setErr("Socket not ready"); return; }
        const fake = { lat: 28.6139 + (Math.random() - 0.5) * 0.1, lng: 77.2090 + (Math.random() - 0.5) * 0.1, ts: Date.now() };
        const uid = user?.id || `sim-${Math.floor(Math.random() * 10000)}`;
        setLocations(prev => ({ ...prev, [uid]: fake }));
        socketRef.current.emit("sendLocation", { tripId, userId: uid, location: { lat: fake.lat, lng: fake.lng } });
    };

    return (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 8 }}>
            <div style={{ flex: 1, minHeight: 420, border: "1px solid #eee", borderRadius: 8, overflow: "hidden" }}>
                <MapContainer center={centerOn || fallbackCenter} zoom={10} style={{ height: 420, width: "100%" }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {centerOn && <FlyTo latlng={centerOn} />}
                    {Object.keys(locations).map(uid => {
                        const l = locations[uid];
                        if (!l) return null;
                        const isMe = user?.id === uid || (uid && uid.toString() === user?.id?.toString());
                        const label = isMe ? `${(user?.name || 'You')}` : uid;
                        return (
                            <Marker key={uid} position={[l.lat, l.lng]}>
                                <Popup>
                                    <div style={{ minWidth: 160 }}>
                                        <div><strong>{label}</strong>{isMe ? " (you)" : ""}</div>
                                        <div style={{ fontSize: 12 }}>Last: {new Date(l.ts).toLocaleString()}</div>
                                        <div style={{ fontSize: 12 }}>Lat: {l.lat.toFixed(5)}, Lon: {l.lng.toFixed(5)}</div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>

                <div style={{ padding: 8, display: "flex", gap: 8, alignItems: "center" }}>
                    {!sharing ? (
                        <button onClick={startSharing}>Start sharing my location</button>
                    ) : (
                        <button onClick={stopSharing}>Stop sharing</button>
                    )}

                    <button onClick={() => {
                        const mine = locations[user?.id];
                        if (mine) setCenterOn([mine.lat, mine.lng]);
                        else setErr("No location for you yet");
                    }}>Center on me</button>

                    <button onClick={loadLastLocations}>Refresh last-known</button>

                    {/* Simulator for testing */}
                    <button onClick={simulateSend}>Simulate my location (test)</button>

                    <button onClick={() => navigate(`/app/trips/${tripId}/track`)}>Open in full page</button>

                    {err && <div style={{ color: "red", marginLeft: 8 }}>{err}</div>}
                </div>
            </div>

            <aside style={{ width: 280 }}>
                <div style={{ border: "1px solid #eee", padding: 8, borderRadius: 8 }}>
                    <h4>Members</h4>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {members.length === 0 && <li>No members found</li>}
                        {members.map(m => {
                            const l = locations[m.id];
                            return (
                                <li key={m.id} style={{ padding: "8px 4px", borderBottom: "1px solid #fafafa" }}>
                                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                                    <div style={{ fontSize: 13 }}>{l ? `Last: ${new Date(l.ts).toLocaleString()}` : "No location yet"}</div>
                                    {l && <button style={{ fontSize: 12, marginTop: 6 }} onClick={() => setCenterOn([l.lat, l.lng])}>Center</button>}
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div style={{ marginTop: 12, border: "1px solid #eee", padding: 8, borderRadius: 8 }}>
                    <h4>Notes</h4>
                    <ol style={{ fontSize: 13 }}>
                        <li>You must start sharing for your location to be sent.</li>
                        <li>Server keeps last-known locations in Redis so others can load them when joining.</li>
                        <li>Use the simulator for testing if you don't have a device or don't want to change browser geolocation.</li>
                    </ol>
                </div>
            </aside>
        </div>
    );
}
