import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import MyReferrals from './pages/MyReferrals';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import AllUsersManagement from './pages/AllUsersManagement';
import './App.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

// Admin Protected Route component
const AdminProtectedRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  return adminToken ? children : <Navigate to="/admin/login" />;
};

// Public Route component (redirect to home if already logged in)
const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/home" /> : children;
};

// Admin Public Route component (redirect to dashboard if already logged in as admin)
const AdminPublicRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  return adminToken ? <Navigate to="/admin/dashboard" /> : children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/signup" />} />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <SignUp />
              </PublicRoute>
            } 
          />
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/home" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-referrals" 
            element={
              <ProtectedRoute>
                <MyReferrals />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/all-users-management" 
            element={
              <ProtectedRoute>
                <AllUsersManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/login" 
            element={
              <AdminPublicRoute>
                <AdminLogin />
              </AdminPublicRoute>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminProtectedRoute>
                <AdminDashboard />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <AdminProtectedRoute>
                <UserManagement />
              </AdminProtectedRoute>
            } 
          />
          <Route 
            path="/admin/all-users" 
            element={
              <AdminProtectedRoute>
                <AllUsersManagement />
              </AdminProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;