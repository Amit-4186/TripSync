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

export default function App() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/" element={<Navigate to={isAuthenticated ? "/app" : "/login"} replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/trips/:id" element={<TripDetail />} />
                <Route path="/app/trips/:id/track" element={<ProtectedRoute><TripLiveMap /></ProtectedRoute>} />
            </Route>

            <Route path="/app/explore/:id" element={<ExploreDestination />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/trip-invite" element={<AcceptInvite />} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}