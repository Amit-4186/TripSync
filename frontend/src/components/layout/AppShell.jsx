import { useEffect, useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import {
    ChevronDown,
    LogOut,
    User,
    Settings,
    HelpCircle,
} from "lucide-react"
import { Button } from "../ui/button"
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react"
import api from "../../lib/api"

export default function AppShell({ children }) {
    const { user, logout } = useAuth()
    const [trips, setTrips] = useState([])
    const [err, setErr] = useState(null)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        const loadTrips = async () => {
            try {
                const { data } = await api.get("/trips")
                setTrips(data.data || [])
            } catch (e) {
                setErr(e.response?.data?.message || "Failed to load trips")
            }
        }
        loadTrips()
    }, [])

    return (
        <div className="min-h-screen bg-app text-app flex flex-col">
            {/* Top bar */}
            <header className="sticky top-0 h-16 border-b border-app flex items-center justify-between px-4 sm:px-6 bg-white/70 backdrop-blur-sm shadow-md z-10">
                {/* Site name */}
                <h1 className="text-[28px] sm:text-[32px] font-verdana font-extrabold tracking-tight text-primary select-none">
                    Tripsync
                </h1>

                <div className="flex items-center gap-4">
                    {/* My Trips Dropdown */}
                    <Menu as="div" className="relative">
                        {({ open }) => (
                            <>
                                <MenuButton
                                    as={Button}
                                    variant="default"
                                    className="flex items-center gap-2 text-base font-semibold"
                                >
                                    <span className="hidden sm:inline">My Trips</span>
                                    <ChevronDown
                                        className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""
                                            }`}
                                    />
                                </MenuButton>

                                <MenuItems
                                    className="absolute right-0 mt-2 w-60 max-h-72 overflow-y-auto bg-white shadow-xl rounded-lg py-2 z-50 focus:outline-none transform transition-all duration-200 ease-out data-[closed]:opacity-0 data-[closed]:translate-y-1"
                                >
                                    {err && (
                                        <p className="px-4 py-2 text-sm text-red-500">{err}</p>
                                    )}
                                    {trips.length === 0 ? (
                                        <p className="px-4 py-2 text-sm text-gray-500 italic">
                                            No trips yet
                                        </p>
                                    ) : (
                                        trips.map((t) => {
                                            const isActive = location.pathname.includes(`/trips/${t.id}`)
                                            return (
                                                <MenuItem
                                                    key={t.id}
                                                    as="button"
                                                    onClick={() => navigate(`/trips/${t.id}`)}
                                                    className={`group flex items-center w-full px-4 py-2 text-left text-sm transition-all duration-150 ease-in-out ${isActive
                                                        ? "bg-primary/10 text-primary font-semibold"
                                                        : "hover:bg-gray-100"
                                                        }`}
                                                >
                                                    <span
                                                        className={`truncate ${isActive
                                                            ? "text-primary"
                                                            : "text-gray-700 group-hover:text-gray-900"
                                                            }`}
                                                    >
                                                        {t.title}
                                                    </span>
                                                </MenuItem>
                                            )
                                        })
                                    )}
                                </MenuItems>
                            </>
                        )}
                    </Menu>

                    {/* User Dropdown */}
                    <Menu as="div" className="relative">
                        <MenuButton className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-700 focus:outline-none hover:scale-105 transition">
                            {user?.name?.charAt(0) || "U"}
                        </MenuButton>

                        <MenuItems
                            className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-lg py-4 px-4 z-50 focus:outline-none transform transition-all duration-150 ease-out data-[closed]:opacity-0 data-[closed]:translate-y-1"
                        >
                            {/* User Info */}
                            <div className="mb-4">
                                <p className="text-sm font-semibold text-gray-800">
                                    {user?.name || "User Name"}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {user?.email || "email@example.com"}
                                </p>
                            </div>

                            {/* Menu Options */}
                            <div className="space-y-2">
                                <MenuItem
                                    as="button"
                                    className="flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm hover:bg-gray-100 transition"
                                >
                                    <User className="w-4 h-4 text-gray-600" />
                                    Profile
                                </MenuItem>
                                <MenuItem
                                    as="button"
                                    className="flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm hover:bg-gray-100 transition"
                                >
                                    <Settings className="w-4 h-4 text-gray-600" />
                                    Settings
                                </MenuItem>
                                <MenuItem
                                    as="button"
                                    className="flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm hover:bg-gray-100 transition"
                                >
                                    <HelpCircle className="w-4 h-4 text-gray-600" />
                                    Help
                                </MenuItem>

                                <hr className="border-gray-300" />

                                <MenuItem
                                    as="button"
                                    onClick={logout}
                                    className="flex items-center gap-2 w-full px-3 py-1 rounded-md text-sm text-red-600 hover:bg-gray-100 transition"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </MenuItem>
                            </div>
                        </MenuItems>
                    </Menu>
                </div>
            </header>

            {/* Main content */}
            <main className="flex-1">{children || <Outlet />}</main>
        </div>
    )
}
