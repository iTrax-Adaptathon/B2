import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

export const getInsightsOverview = () =>
  axios.get(`${API_URL}/api/insights/overview`, { headers: authHeaders() }).then((r) => r.data.data);

export const getHeatmap = (days = 90) =>
  axios.get(`${API_URL}/api/insights/heatmap?days=${days}`, { headers: authHeaders() }).then((r) => r.data.data);

export const simulateChange = (baseline, proposed) =>
  axios
    .post(`${API_URL}/api/insights/simulate`, { baseline, proposed }, { headers: authHeaders() })
    .then((r) => r.data.data);

export const getTodaysChallenges = () =>
  axios.get(`${API_URL}/api/challenges/today`, { headers: authHeaders() }).then((r) => r.data.data);

export const acceptChallenge = (id) =>
  axios.post(`${API_URL}/api/challenges/${id}/accept`, {}, { headers: authHeaders() }).then((r) => r.data.data);

export const completeChallenge = (id) =>
  axios.post(`${API_URL}/api/challenges/${id}/complete`, {}, { headers: authHeaders() }).then((r) => r.data);