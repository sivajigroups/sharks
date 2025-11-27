import { createSlice } from "@reduxjs/toolkit";
import { getNextMidnightTimestamp } from "../utils/dateUtils";

const initialState = {
  user: null,
  role: null,
  branch: null,
  isLoggedIn: false,
  loginDate: null,
  logintoken: null,
  expiresAt: null, // ⭐ ADD THIS
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
      state.expiresAt = getNextMidnightTimestamp(); // ⭐ SET EXPIRY
    },
    logout: (state) => {
      state.user = null;
      state.role = null;
      state.branch = null;
      state.isLoggedIn = false;
      state.loginDate = null;
      state.logintoken = null;
      state.expiresAt = null; // ⭐ CLEAR EXPIRY
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
