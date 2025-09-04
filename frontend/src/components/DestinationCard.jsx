import { useNavigate } from "react-router-dom"
import { Button } from "./ui/button"
import { MapPin } from "lucide-react"
import { Card } from "./ui/card"

export default function DestinationCard({ destination }) {
    const navigate = useNavigate()

    return (
        <Card
            onClick={() => navigate(`/explore/${destination.id}`)}
            className="group cursor-pointer overflow-hidden relative h-64 border-0 shadow-md rounded-[20px]"
        >
            {/* Background Image */}
            {destination.coverImage && (
                <img
                    src={destination.coverImage}
                    alt={destination.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            <div className="absolute top-1/2 transform -translate-y-1/2 left-0 right-0 px-6">
                <div className="flex items-center space-x-2 mb-2">
                    <MapPin className="w-6 h-6 text-white" />
                    <h3 className="text-2xl font-semibold text-white drop-shadow-md">
                        {destination.name}
                    </h3>
                </div>

                {destination.description && (
                    <p className="text-md text-white/90 drop-shadow line-clamp-2 max-w-md">
                        {destination.description}
                    </p>
                )}
            </div>

            {/* Button at Bottom */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <Button
                    variant="secondary"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                    Explore
                </Button>
            </div>
        </Card>

    )
}
