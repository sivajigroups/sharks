import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store, persistor } from './redux/store'; // 👈 include persistor
import { PersistGate } from 'redux-persist/integration/react'; // 👈 add this
import { Toaster } from 'sonner';

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
