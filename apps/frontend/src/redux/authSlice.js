import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,       // stores email
  role: null,   
  branch:null,    // stores 'admin' or 'staff'
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action) => {
      // Expecting payload like: { email: "admin@gmail.com", role: "admin" }
    //  state.user = action.payload.email;
      state.user = action.payload.phone; // Changed to phone
      state.role = action.payload.role;
      state.branch=action.payload.branch;
      state.isLoggedIn = true;
    },
    logout: (state) => {
      state.user = null;
      state.role = null;
      state.branch=null;
      state.isLoggedIn = false;
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
