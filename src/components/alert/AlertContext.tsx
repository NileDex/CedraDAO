import React, { createContext, useContext } from 'react';
import Swal from 'sweetalert2';


// --------------------
// Global Alert Context
// --------------------
// Provides a global alert system for the app using SweetAlert2
interface AlertContextType {
  showAlert: (_message: string, _type?: 'success' | 'error' | 'info') => void;
}

const AlertContext = createContext<AlertContextType>({ showAlert: () => { } });
export const useAlert = () => useContext(AlertContext);

// Configures a SweetAlert2 Toast
const Toast = Swal.mixin({
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#0d0d0f',
  color: '#ffffff',
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`[Alert] Calling showAlert: ${message} (${type})`);
    if (type === 'error') {
      // Full modal for errors for better visibility
      Swal.fire({
        icon: 'error',
        title: 'Action Required',
        text: message,
        background: '#0d0d0f',
        color: '#ffffff',
        confirmButtonColor: '#e1fd6a',
        confirmButtonText: '<span style="color: black; font-weight: bold;">OK</span>',
        customClass: {
          popup: 'rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl',
          title: 'text-xl font-bold !text-white',
          htmlContainer: 'text-sm text-white/70'
        }
      });
    } else {
      // Keep toasts for success/info to be less intrusive
      Toast.fire({
        icon: type,
        title: message,
        customClass: {
          popup: 'rounded-xl border border-white/10 shadow-2xl backdrop-blur-xl',
          title: 'text-sm font-semibold !text-white'
        }
      });
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
};