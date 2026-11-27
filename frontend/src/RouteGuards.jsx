import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute
 * Redirects unauthenticated users to /login.
 * Usage:
 *   <ProtectedRoute><MyPage /></ProtectedRoute>
 */
export const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const currentRole = localStorage.getItem('user_role');
  const location = useLocation();

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }
  if (currentRole === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return children;
};

/**
 * RoleRoute
 * Redirects to /403 if the logged-in user does not have the required role,
 * or to /login if unauthenticated.
 * Usage:
 *   <RoleRoute role="admin"><AdminDashboard /></RoleRoute>
 */
export const RoleRoute = ({ children, role }) => {
  const token = localStorage.getItem('access_token');
  const currentRole = localStorage.getItem('user_role');
  const isOwner = localStorage.getItem('is_owner') === 'true';
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Normalise: admins can access everything, owners can access owner-level routes
  const allowed =
    currentRole === role ||
    currentRole === 'admin' ||
    (role === 'owner' && (currentRole === 'owner' || isOwner));

  if (!allowed) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

/**
 * GuestRoute
 * Redirects already-authenticated users to / (home).
 * Use for Login and Register pages.
 */
export const GuestRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  const currentRole = localStorage.getItem('user_role');
  if (token) {
    if (currentRole === 'admin') return <Navigate to="/admin" replace />;
    if (currentRole === 'owner') return <Navigate to="/owner" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};
