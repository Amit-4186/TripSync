import { Navigate, Route, Routes } from "react-router-dom"; 
import Login from "./pages/Login"; 
import Register from "./pages/Register"; 
import Dashboard from "./pages/Dashboard"; 
import TripDetail from "./pages/TripDetail"; 
import ProtectedRoute from "./components/ProtectedRoute"; 
import { useAuth } from "./context/AuthContext"; 

export default function App() { 
const { isAuthenticated } = useAuth(); 
    return ( 
        <Routes> 
        <Route 
        path="/" 
        element={<Navigate to={isAuthenticated ? "/app" : "/login"} replace />} 
        /> 
        {/* public */} 
        <Route path="/login" element={<Login />} /> 
        <Route path="/register" element={<Register />} /> 
        {/* protected */} 
        <Route element={<ProtectedRoute />}> 
        <Route path="/app" element={<Dashboard />} /> 
        <Route path="/app/trips/:id" element={<TripDetail />} /> 
        </Route> 
        <Route path="*" element={<Navigate to="/" replace />} /> 
        </Routes> 
    ); 
}