import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store, persistor } from './redux/store';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'sonner';

// ⭐ Add interceptor imports
import axios from "axios";
import { logout } from "./redux/authSlice";

// ⭐ Global axios interceptor (no new file)
// axios.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error?.response?.status === 401) {
//       console.warn("⛔ Auto-logout triggered: Token expired or invalid");

//       store.dispatch(logout());
//       window.location.href = "/login";
//     }
//     return Promise.reject(error);
//   }
// );
// ⭐ End

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <StrictMode>
        <Toaster position="top-center" richColors />
        <App />
      </StrictMode>
    </PersistGate>
  </Provider>
);
