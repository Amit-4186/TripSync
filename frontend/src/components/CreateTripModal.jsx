import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Button } from "./ui/button"
import api from "../lib/api"

export default function CreateTripModal({ isOpen, onClose, onTripCreated }) {
    const [name, setName] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const { data } = await api.post("/trips", {
                title: name,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            })
            if (data?.data) {
                onTripCreated?.(data.data) // Trip created callback
            }
            setName("")
            setStartDate("")
            setEndDate("")
            onClose()
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create trip")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white py-20 px-10 max-w-xl ">
                <DialogHeader className="mb-2">
                    <DialogTitle className="text-3xl font-semibold text-gray-900">
                        Create a New Trip
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-8 text-base">
                    {/* Trip Name */}
                    <div>
                        <Label htmlFor="name" className="text-lg font-medium text-gray-700">
                            Trip Name
                        </Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="text-base py-3"
                        />
                    </div>

                    {/* Dates */}
                    <div className="flex gap-6">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="startDate" className="text-lg font-medium text-gray-700">
                                Start Date
                            </Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-base py-3"
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="endDate" className="text-lg font-medium text-gray-700">
                                End Date
                            </Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-base py-3"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <p className="text-red-500 text-sm font-medium">{error}</p>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="default"
                        disabled={loading}
                        className="w-full py-3 text-base font-semibold"
                    >
                        {loading ? "Creating..." : "Create Trip"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )

}
