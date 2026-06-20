// api.js
//
// Single axios instance used everywhere instead of the bare axios import. In development, VITE_API_URL is empty so requests
// stay relative (handled by Vite's proxy). In production (Docker/
// deployed), VITE_API_URL points to the real backend URL.

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
});

export default api;