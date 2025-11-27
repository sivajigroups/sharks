import axios from "axios";
import { store } from "@/redux/store";
import { logout } from "@/redux/authSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  withCredentials: true,
});

// GLOBAL 401 HANDLER
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      store.dispatch(logout());
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
