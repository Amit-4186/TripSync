import { useNavigate } from "react-router-dom";

export default function DestinationCard({ destination }) {
    const navigate = useNavigate();
    return (
        <div
            onClick={() => navigate(`/explore/${destination.id}`)}
            className="cursor-pointer rounded-lg shadow-md overflow-hidden bg-white"
        >
            {destination.coverImage && (
                <img
                    src={destination.coverImage}
                    alt={destination.name}
                    className="h-40 w-full object-cover"
                />
            )}
            <div className="p-3">
                <h3 className="font-semibold text-lg">{destination.name}</h3>
                {destination.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{destination.description}</p>
                )}
            </div>
        </div>
    );
}
