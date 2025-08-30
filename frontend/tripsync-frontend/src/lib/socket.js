import { io } from "socket.io-client";

function getToken() {
    return localStorage.getItem("ts_access_token");
}

let socket;

export function getSocket() {
    if (socket && socket.connected) return socket;

    const apiUrl = process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";
    const urlObj = new URL(apiUrl);
    const wsUrl = process.env.VITE_WS_URL || `${urlObj.origin}`;

    socket = io(wsUrl, {
        transports: ["websocket"],
        auth: { token: getToken() },
        reconnection: true,
    });

    socket.updateAuth = (token) => {
        socket.auth = { token };
        if (socket.connected) {
            socket.disconnect();
        }
        socket.connect();
    };

    return socket;
}