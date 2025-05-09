import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import VerifyEmail from './pages/VerifyEmail'; // Added import
import ForgotPasswordPage from './pages/ForgetPass';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';

// Error Boundary to catch rendering errors
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
            <p className="mt-2 text-sm text-gray-600">{this.state.error.toString()}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children, allowedRole }) {
  const token = localStorage.getItem("token");
  const [userRole, setUserRole] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/user", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          localStorage.removeItem("token");
          setIsLoading(false);
          return;
        }

        setUserRole(data.role);
        setIsLoading(false);
      } catch (err) {
        console.error("Error verifying token:", err);
        localStorage.removeItem("token");
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!token || !userRole) {
    return <Navigate to="/signin" />;
  }

  if (allowedRole && userRole !== allowedRole) {
    return <Navigate to="/signin" />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
      {/* <BrowserRouter> */}
        <Routes>
          <Route path="/" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgetpass" element={<ForgotPasswordPage />} />
          <Route
            path="/doctor-dashboard"
            element={
              <ProtectedRoute allowedRole="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient-dashboard"
            element={
              <ProtectedRoute allowedRole="patient">
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          {/* Catch-all route for unmatched URLs */}
          <Route path="*" element={<Navigate to="/signin" />} />
        </Routes>
      {/* </BrowserRouter> */}
    </ErrorBoundary>
  );
}