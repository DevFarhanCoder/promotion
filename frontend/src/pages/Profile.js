import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!user) {
    return <div className="loading">User not found</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>User Profile</h1>
        <div className="header-actions">
          <Link to="/home" className="back-link">← Back to Home</Link>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-card">
          <div className="profile-photo-section">
            {user.profilePhoto ? (
              <img 
                src={`http://localhost:5000/uploads/${user.profilePhoto}`}
                alt="Profile"
                className="profile-photo"
              />
            ) : (
              <div className="no-photo">
                <span>No Photo</span>
              </div>
            )}
          </div>

          <div className="profile-info">
            <div className="info-group">
              <label>Full Name:</label>
              <span>{user.name}</span>
            </div>

            <div className="info-group">
              <label>Display Name:</label>
              <span>{user.displayName}</span>
              <small>This name appears on your promotional images</small>
            </div>

            <div className="info-group">
              <label>Mobile Number:</label>
              <span>{user.mobile}</span>
            </div>

            <div className="info-group">
              <label>Account Created:</label>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <Link to="/home" className="form-button">
            Generate Promotional Images
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;