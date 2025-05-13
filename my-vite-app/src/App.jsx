// import React, { Component } from 'react';
// import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
// import { Provider, useSelector, useDispatch } from 'react-redux';
// import store from './redux/store';
// import Signup from './pages/Signup';
// import Signin from './pages/Signin';
// import VerifyEmail from './pages/VerifyEmail';
// import ForgotPasswordPage from './pages/ForgetPass';
// import DoctorDashboard from './pages/DoctorDashboard';
// import PatientDashboard from './pages/PatientDashboard';
// import {
//   verifyTokenStart,
//   verifyTokenSuccess,
//   verifyTokenFailure,
//   logout,
// } from './redux/slices/authSlice';

// // Error Boundary
// class ErrorBoundary extends Component {
//   state = { error: null };
//   static getDerivedStateFromError(error) {
//     return { error };
//   }
//   componentDidCatch(error, errorInfo) {
//     console.error("[ErrorBoundary] Caught error:", error, errorInfo);
//   }
//   render() {
//     if (this.state.error) {
//       return (
//         <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
//           <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
//             <h2 className="text-2xl font-bold text-red-600">Something went wrong</h2>
//             <p className="mt-2 text-sm text-gray-600">{this.state.error.toString()}</p>
//             <button
//               onClick={() => window.location.reload()}
//               className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md"
//             >
//               Reload Page
//             </button>
//           </div>
//         </div>
//       );
//     }
//     return this.props.children;
//   }
// }

// // ProtectedRoute
// function ProtectedRoute({ children, allowedRole }) {
//   const dispatch = useDispatch();
//   const { isAuthenticated, role: reduxRole } = useSelector((state) => state.auth);
//   const [userRole, setUserRole] = React.useState(null);
//   const [isLoading, setIsLoading] = React.useState(true);
//   const [error, setError] = React.useState(null);

//   console.log("[ProtectedRoute] Initial state:", {
//     isAuthenticated,
//     reduxRole,
//     userRole,
//     isLoading,
//     error,
//     allowedRole,
//     token: localStorage.getItem("token") || "none",
//     path: window.location.pathname,
//     timestamp: new Date().toISOString(),
//   });

//   React.useEffect(() => {
//     let isMounted = true;
//     const verifyToken = async () => {
//       if (!isMounted) {
//         console.log("[ProtectedRoute] Aborted: Unmounted");
//         return;
//       }
//       const token = localStorage.getItem("token");
//       console.log("[ProtectedRoute] Token:", { exists: !!token, token: token || "none" });
//       if (!token) {
//         console.log("[ProtectedRoute] No token found");
//         setError("No authentication token found");
//         dispatch(verifyTokenFailure("No token found"));
//         setIsLoading(false);
//         return;
//       }

//       try {
//         dispatch(verifyTokenStart());
//         console.log("[ProtectedRoute] Fetching /api/user/user");
//         const response = await fetch("http://localhost:5000/api/user/user", {
//           method: "GET",
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const data = await response.json();
//         console.log("[ProtectedRoute] Response:", { status: response.status, data });

//         if (isMounted) {
//           if (response.ok) {
//             console.log("[ProtectedRoute] Success:", { role: data.role });
//             setUserRole(data.role);
//             dispatch(
//               verifyTokenSuccess({
//                 user: data,
//                 role: data.role,
//                 isEmailVerified: data.isEmailVerified || false,
//               })
//             );
//           } else {
//             console.error("[ProtectedRoute] Failed:", data.message);
//             localStorage.removeItem("token");
//             setError(data.message || "Invalid token");
//             dispatch(verifyTokenFailure(data.message || "Invalid token"));
//           }
//         }
//       } catch (err) {
//         if (isMounted) {
//           console.error("[ProtectedRoute] Error:", { message: err.message });
//           localStorage.removeItem("token");
//           setError("Failed to connect to backend");
//           dispatch(verifyTokenFailure("Backend connection failed"));
//         }
//       } finally {
//         if (isMounted) {
//           setIsLoading(false);
//         }
//       }
//     };

//     if (!userRole && !error) {
//       console.log("[ProtectedRoute] Starting verification");
//       verifyToken();
//     }

//     return () => {
//       isMounted = false;
//     };
//   }, [dispatch, userRole, error]);

//   if (isLoading) {
//     console.log("[ProtectedRoute] Loading");
//     return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
//   }

//   if (error) {
//     console.log("[ProtectedRoute] Error:", error);
//     return (
//       <div className="min-h-screen flex items-center justify-center">
//         <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
//           <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
//           <p className="mt-2 text-sm text-gray-600">{error}</p>
//           <button
//             onClick={() => {
//               localStorage.removeItem("token");
//               dispatch(logout());
//               window.location.href = "/signin";
//             }}
//             className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md"
//           >
//             Return to Sign In
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (!userRole) {
//     console.log("[ProtectedRoute] No user role, redirecting to /signin");
//     return <Navigate to="/signin" replace />;
//   }

//   if (allowedRole && userRole !== allowedRole) {
//     console.log("[ProtectedRoute] Role mismatch:", { currentRole: userRole, requiredRole: allowedRole });
//     return <Navigate to="/signin" replace />;
//   }

//   console.log("[ProtectedRoute] Rendering children");
//   return children;
// }

// // RedirectHandler
// function RedirectHandler() {
//   const location = useLocation();
//   const path = location.pathname.toLowerCase();
//   console.log("[RedirectHandler] Processing:", { path, timestamp: new Date().toISOString() });

//   if (path === '/doctor-dashboard' || path === '/doctor-dashboard/') {
//     console.log("[RedirectHandler] Exact match for /doctor-dashboard");
//     return (
//       <ProtectedRoute allowedRole="doctor">
//         <DoctorDashboard />
//       </ProtectedRoute>
//     );
//   }
//   if (path.startsWith('/doctor-dashboard')) {
//     console.log("[RedirectHandler] Redirecting to /doctor-dashboard");
//     return (
//       <ProtectedRoute allowedRole="doctor">
//         <Navigate to="/doctor-dashboard" replace />
//       </ProtectedRoute>
//     );
//   }

//   if (path === '/patient-dashboard' || path === '/patient-dashboard/') {
//     console.log("[RedirectHandler] Exact match for /patient-dashboard");
//     return (
//       <ProtectedRoute allowedRole="patient">
//         <PatientDashboard />
//       </ProtectedRoute>
//     );
//   }
//   if (path.startsWith('/patient-dashboard')) {
//     console.log("[RedirectHandler] Redirecting to /patient-dashboard");
//     return (
//       <ProtectedRoute allowedRole="patient">
//         <Navigate to="/patient-dashboard" replace />
//       </ProtectedRoute>
//     );
//   }

//   console.log("[RedirectHandler] Unmatched path, redirecting to /signin");
//   return <Navigate to="/signin" replace />;
// }

// export default function App() {
//   console.log("[App] Rendering:", { path: window.location.pathname, timestamp: new Date().toISOString() });

//   return (
//     <Provider store={store}>
//       <ErrorBoundary>
//         <Routes>
//           <Route path="/" element={<Signup />} />
//           <Route path="/signin" element={<Signin />} />
//           <Route path="/verify-email" element={<VerifyEmail />} />
//           <Route path="/forgetpass" element={<ForgotPasswordPage />} />
//           <Route path="/doctor-dashboard" element={<RedirectHandler />} />
//           <Route path="/patient-dashboard" element={<RedirectHandler />} />
//           <Route path="*" element={<RedirectHandler />} />
//           <Route
//             path="/debug"
//             element={
//               <div className="min-h-screen flex items-center justify-center">
//                 <h1 className="text-2xl">Debug: App is rendering</h1>
//               </div>
//             }
//           />
//         </Routes>
//       </ErrorBoundary>
//     </Provider>
//   );
// }


import React, { Component } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store from './redux/store';
import Signup from './pages/Signup';
import Signin from './pages/Signin';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPasswordPage from './pages/ForgetPass';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';
import {
  verifyTokenStart,
  verifyTokenSuccess,
  verifyTokenFailure,
  logout,
} from './redux/slices/authSlice';

// Error Boundary
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
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

// ProtectedRoute
function ProtectedRoute({ children, allowedRole }) {
  const dispatch = useDispatch();
  const { isAuthenticated, role: reduxRole } = useSelector((state) => state.auth);
  const [userRole, setUserRole] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  console.log("[ProtectedRoute] Initial state:", {
    isAuthenticated,
    reduxRole,
    userRole,
    isLoading,
    error,
    allowedRole,
    token: localStorage.getItem("token") || "none",
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
  });

  React.useEffect(() => {
    let isMounted = true;
    const verifyToken = async () => {
      if (!isMounted) {
        console.log("[ProtectedRoute] Aborted: Unmounted");
        return;
      }
      const token = localStorage.getItem("token");
      console.log("[ProtectedRoute] Token:", { exists: !!token, token: token || "none" });
      if (!token) {
        console.log("[ProtectedRoute] No token found");
        setError("No authentication token found");
        dispatch(verifyTokenFailure("No token found"));
        setIsLoading(false);
        return;
      }

      try {
        dispatch(verifyTokenStart());
        console.log("[ProtectedRoute] Fetching /api/user/user");
        const response = await fetch("http://localhost:5000/api/user/user", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        console.log("[ProtectedRoute] Response:", { status: response.status, data });

        if (isMounted) {
          if (response.ok) {
            console.log("[ProtectedRoute] Success:", { role: data.role });
            setUserRole(data.role);
            dispatch(
              verifyTokenSuccess({
                user: data,
                role: data.role,
                isEmailVerified: data.isEmailVerified || false,
              })
            );
          } else {
            console.error("[ProtectedRoute] Failed:", data.message);
            localStorage.removeItem("token");
            setError(data.message || "Invalid token");
            dispatch(verifyTokenFailure(data.message || "Invalid token"));
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("[ProtectedRoute] Error:", { message: err.message });
          localStorage.removeItem("token");
          setError("Failed to connect to backend");
          dispatch(verifyTokenFailure("Backend connection failed"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!userRole && !error) {
      console.log("[ProtectedRoute] Starting verification");
      verifyToken();
    }

    return () => {
      isMounted = false;
    };
  }, [dispatch, userRole, error]);

  if (isLoading) {
    console.log("[ProtectedRoute] Loading");
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    console.log("[ProtectedRoute] Error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-red-600">Authentication Error</h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              dispatch(logout());
              window.location.href = "/auth/signin";
            }}
            className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!userRole) {
    console.log("[ProtectedRoute] No user role, redirecting to /auth/signin");
    return <Navigate to="/auth/signin" replace />;
  }

  if (allowedRole && userRole !== allowedRole) {
    console.log("[ProtectedRoute] Role mismatch:", { currentRole: userRole, requiredRole: allowedRole });
    return <Navigate to="/auth/signin" replace />;
  }

  console.log("[ProtectedRoute] Rendering children");
  return children;
}

// AuthRedirect: Redirects authenticated users from /auth/* routes
function AuthRedirect({ children }) {
  const { pathname } = useLocation();
  const dispatch = useDispatch();
  const [userRole, setUserRole] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  console.log("[AuthRedirect] Checking:", {
    pathname,
    token: localStorage.getItem("token") || "none",
    timestamp: new Date().toISOString(),
  });

  React.useEffect(() => {
    let isMounted = true;
    const verifyToken = async () => {
      if (!isMounted) {
        console.log("[AuthRedirect] Aborted: Unmounted");
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("[AuthRedirect] No token, allowing auth route");
        setIsLoading(false);
        return;
      }

      try {
        console.log("[AuthRedirect] Fetching /api/user/user");
        const response = await fetch("http://localhost:5000/api/user/user", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        console.log("[AuthRedirect] Response:", { status: response.status, data });

        if (isMounted) {
          if (response.ok) {
            console.log("[AuthRedirect] Success:", { role: data.role });
            setUserRole(data.role);
            dispatch(
              verifyTokenSuccess({
                user: data,
                role: data.role,
                isEmailVerified: data.isEmailVerified || false,
              })
            );
          } else {
            console.error("[AuthRedirect] Failed:", data.message);
            localStorage.removeItem("token");
            setError(data.message || "Invalid token");
            dispatch(verifyTokenFailure(data.message || "Invalid token"));
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("[AuthRedirect] Error:", { message: err.message });
          localStorage.removeItem("token");
          setError("Failed to connect to backend");
          dispatch(verifyTokenFailure("Backend connection failed"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifyToken();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  if (isLoading) {
    console.log("[AuthRedirect] Loading");
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    console.log("[AuthRedirect] Error, allowing auth route");
    return children; // Allow auth pages if token is invalid
  }

  if (userRole && pathname.startsWith('/auth')) {
    console.log("[AuthRedirect] Token present, redirecting to dashboard:", { userRole });
    const redirectTo = userRole === 'doctor' ? '/doctor-dashboard' : '/patient-dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  console.log("[AuthRedirect] No token or not an auth route, rendering children");
  return children;
}

// RedirectHandler
function RedirectHandler() {
  const location = useLocation();
  const path = location.pathname.toLowerCase();
  console.log("[RedirectHandler] Processing:", { path, timestamp: new Date().toISOString() });

  if (path === '/doctor-dashboard' || path === '/doctor-dashboard/') {
    console.log("[RedirectHandler] Exact match for /doctor-dashboard");
    return (
      <ProtectedRoute allowedRole="doctor">
        <DoctorDashboard />
      </ProtectedRoute>
    );
  }
  if (path.startsWith('/doctor-dashboard')) {
    console.log("[RedirectHandler] Redirecting to /doctor-dashboard");
    return (
      <ProtectedRoute allowedRole="doctor">
        <Navigate to="/doctor-dashboard" replace />
      </ProtectedRoute>
    );
  }

  if (path === '/patient-dashboard' || path === '/patient-dashboard/') {
    console.log("[RedirectHandler] Exact match for /patient-dashboard");
    return (
      <ProtectedRoute allowedRole="patient">
        <PatientDashboard />
      </ProtectedRoute>
    );
  }
  if (path.startsWith('/patient-dashboard')) {
    console.log("[RedirectHandler] Redirecting to /patient-dashboard");
    return (
      <ProtectedRoute allowedRole="patient">
        <Navigate to="/patient-dashboard" replace />
      </ProtectedRoute>
    );
  }

  console.log("[RedirectHandler] Unmatched path, redirecting to /auth/signin");
  return <Navigate to="/auth/signin" replace />;
}

export default function App() {
  console.log("[App] Rendering:", { path: window.location.pathname, timestamp: new Date().toISOString() });

  return (
    <Provider store={store}>
      <ErrorBoundary>
        <AuthRedirect>
          <Routes>
            {/* Auth Routes */}
            <Route path="/auth/signin" element={<Signin />} />
            <Route path="/auth/signup" element={<Signup />} />
            <Route path="/auth/verify-email" element={<VerifyEmail />} />
            <Route path="/auth/forgetpass" element={<ForgotPasswordPage />} />

            {/* Dashboard Routes */}
            <Route path="/doctor-dashboard" element={<RedirectHandler />} />
            <Route path="/patient-dashboard" element={<RedirectHandler />} />
            <Route path="/" element={<Navigate to="/auth/signup" replace />} />
            <Route path="*" element={<RedirectHandler />} />

            {/* Debug Route */}
            <Route
              path="/debug"
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <h1 className="text-2xl">Debug: App is rendering</h1>
                </div>
              }
            />
          </Routes>
        </AuthRedirect>
      </ErrorBoundary>
    </Provider>
  );
}