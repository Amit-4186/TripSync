import axios from "axios";
const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("ts_access_token");
    if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem("ts_access_token");
            localStorage.removeItem("ts_user");
            if (typeof window !== "undefined") {
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);

export default api;