import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import TripDetail from "./pages/TripDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import Explore from "./pages/Explore";
import ExploreDestination from "./pages/ExploreDestination";
import AcceptInvite from "./pages/AcceptInvite";
import TripLiveMap from "./components/TripLiveMap";
import AppShell from "./components/layout/AppShell";

export default function App() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route
                path="/"
                element={
                    <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
                }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes with AppShell */}
            <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/trips/:id" element={<TripDetail />} />
                    <Route
                        path="/trips/:id/track"
                        element={<TripLiveMap />}
                    />
                </Route>
            </Route>

            {/* Non-protected routes */}
            <Route path="/explore/:id" element={<ExploreDestination />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/trip-invite" element={<AcceptInvite />} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}