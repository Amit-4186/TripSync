import { useEffect, useState } from "react"
import { Plus, MapPin, Users, Calendar } from "lucide-react"
import { Button } from "../components/ui/button"
import DestinationCard from "../components/DestinationCard"
import CreateTripModal from "../components/CreateTripModal"
import api from "../lib/api"

export default function Dashboard() {
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false)
  const [destinations, setDestinations] = useState([])
  const [trips, setTrips] = useState([])
  const [loadingDestinations, setLoadingDestinations] = useState(false)
  const [error, setError] = useState(null)

  // Load trips + destinations
  const loadTrips = async () => {
    try {
      const { data } = await api.get("/trips")
      setTrips(data.data || [])
    } catch (err) {
      setError("Failed to load trips")
    }
  }

  const loadDestinations = async () => {
    setLoadingDestinations(true)
    try {
      const { data } = await api.get("/destinations")
      if (data.success) {
        setDestinations(data.data)
      } else {
        setError("Failed to load destinations")
      }
    } catch (err) {
      setError("Failed to load destinations")
    } finally {
      setLoadingDestinations(false)
    }
  }

  useEffect(() => {
    loadTrips()
    loadDestinations()
  }, [])

  const handleTripCreated = (trip) => {
    setTrips((prev) => [trip, ...prev])
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="hero-section py-16 px-4 bg-cyan-500 text-white">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-7xl font-bold mb-6 animate-fade-in" style={{ textShadow: '1px 1px 6px rgba(0,0,0,.3)' }}>
            Where do you want to go next?
          </h1>
          <p className="text-xl md:text-3xl mb-8 max-w-3xl mx-auto animate-fade-in">
            Plan amazing trips with friends, explore new destinations, and create unforgettable memories together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up">
            <Button
              size="lg"
              variant="custom"
              onClick={() => setIsCreateTripOpen(true)}
            >
              <Plus className="w-8 h-8 mr-2" />
              Create New Trip
            </Button>
            <div className="flex items-center space-x-6 text-white/90">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span className="text-xl">{destinations.length}+ Destinations</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span className="text-xl">Group Planning</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span className="text-xl">Live Tracking</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Destinations Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Popular Destinations
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover amazing places perfect for your next group adventure
            </p>
          </div>

          {loadingDestinations ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : destinations.length === 0 ? (
            <p className="text-center text-muted-foreground">No destinations found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.id}
                  destination={destination}
                  onClick={() => setIsCreateTripOpen(true)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Floating Create Trip Button */}
      <button
        className="fixed bottom-6 right-6 bg-brand-600 text-white rounded-full p-4 shadow-lg hover:bg-brand-700 transition"
        onClick={() => setIsCreateTripOpen(true)}
        aria-label="Create new trip"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        onTripCreated={handleTripCreated}
      />
    </div>
  )
}
