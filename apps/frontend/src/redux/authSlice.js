import { createSlice } from "@reduxjs/toolkit";
import { getNextMidnightTimestamp } from "../utils/dateUtils";

const initialState = {
  user: null,
  role: null,
  branch: null,
  isLoggedIn: false,
  loginDate: null,
  logintoken: null,
  expiresAt: null,
  branches: [], // ⭐ Store all available branches
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      state.user = action.payload.phone;
      state.role = action.payload.role;
      state.branch = action.payload.branch;
      state.isLoggedIn = true;
      state.loginDate = new Date().toDateString();
      state.logintoken = action.payload.token || null;
      state.branches = action.payload.branches || []; // Store branches
      // If active branch passed, set it, else leave null (to be set by selection)
      state.branch = action.payload.branch || null;
      state.expiresAt = getNextMidnightTimestamp();
    },
    setActiveBranch: (state, action) => {
      state.branch = action.payload; // Payload should be { id, name } or similar
    },
    logout: (state) => {
      state.user = null;
      state.role = null;
      state.branch = null;
      state.isLoggedIn = false;
      state.loginDate = null;
      state.logintoken = null;
      state.expiresAt = null;
      state.branches = [];
    },
  },
});

export const { login, logout, setActiveBranch } = authSlice.actions;
export default authSlice.reducer;
