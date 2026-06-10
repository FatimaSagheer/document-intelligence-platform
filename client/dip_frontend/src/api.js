import axios from "axios";

const API = axios.create({
  baseURL: "https://verbose-space-capybara-55wqww79j9whp7r-5000.app.github.dev/api"
});

API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;