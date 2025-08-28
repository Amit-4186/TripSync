import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api"; // Import your API instance

export default function ExploreDestination() {
    const { id } = useParams();
    const [tab, setTab] = useState("places");
    const [places, setPlaces] = useState([]);
    const [rentals, setRentals] = useState([]);
    const [destination, setDestination] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDestinationData = async () => {
            try {
                setLoading(true);

                // Load destination details
                const destResponse = await api.get(`/destinations/${id}`);
                if (destResponse.data.success) {
                    setDestination(destResponse.data.data);
                }

                // Load places
                const placesResponse = await api.get(`/destinations/${id}/places`);
                if (placesResponse.data.success) {
                    setPlaces(placesResponse.data.data);
                }

                // Load rentals
                const rentalsResponse = await api.get(`/destinations/${id}/rentals`);
                if (rentalsResponse.data.success) {
                    setRentals(rentalsResponse.data.data);
                }
            } catch (error) {
                console.error("Failed to load destination data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            loadDestinationData();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="p-4">
                <p>Loading destination details...</p>
            </div>
        );
    }

    return (
        <div className="p-4">
            {destination && (
                <div className="mb-4">
                    <h2 className="text-xl font-bold">{destination.name}</h2>
                    <p className="text-gray-600">{destination.description}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b mb-4">
                <button
                    className={`px-4 py-2 ${tab === "places" ? "border-b-2 border-blue-600 font-semibold" : ""}`}
                    onClick={() => setTab("places")}
                >
                    Places
                </button>
                <button
                    className={`px-4 py-2 ${tab === "rentals" ? "border-b-2 border-blue-600 font-semibold" : ""}`}
                    onClick={() => setTab("rentals")}
                >
                    Rentals
                </button>
            </div>

            {/* Content */}
            {tab === "places" ? (
                <div className="space-y-2">
                    {places.length === 0 ? (
                        <p className="text-gray-600">No places found for this destination.</p>
                    ) : (
                        places.map((p) => (
                            <div key={p.id} className="border p-3 rounded-lg shadow-sm bg-white">
                                <h3 className="font-semibold">{p.name}</h3>
                                <p className="text-sm text-gray-600">{p.category}</p>
                                {p.address && <p className="text-sm text-gray-500">{p.address}</p>}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {rentals.length === 0 ? (
                        <p className="text-gray-600">No rentals found for this destination.</p>
                    ) : (
                        rentals.map((r) => (
                            <div key={r.id} className="border p-3 rounded-lg shadow-sm bg-white">
                                <h3 className="font-semibold">{r.vendorName}</h3>
                                <p className="text-sm text-gray-600">{r.type}</p>
                                {r.contactPhone && <p className="text-sm text-gray-500">Phone: {r.contactPhone}</p>}
                                {r.pricePerDay && <p className="text-sm text-gray-500">Price/day: ${r.pricePerDay}</p>}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}