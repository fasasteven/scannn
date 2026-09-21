import axios from "axios";

const rawApiUrl = import.meta.env.VITE_API_URL || "/api";
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, "");
const apiBaseUrl = normalizedApiUrl.endsWith("/api")
  ? normalizedApiUrl
  : `${normalizedApiUrl}/api`;

const api = axios.create({ baseURL: apiBaseUrl, withCredentials: true });

api.interceptors.request.use((config) => config);

export default api;
