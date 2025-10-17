import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    mobile: '',
    userType: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const userObj = JSON.parse(userData);
      setUser(userObj);
      setFormData({
        name: userObj.name || '',
        displayName: userObj.displayName || '',
        mobile: userObj.mobile || '',
        userType: userObj.userType || 'Customer'
      });
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

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setMessage('');
    if (!isEditing) {
      // Reset form data when starting edit
      setFormData({
        name: user.name || '',
        displayName: user.displayName || '',
        mobile: user.mobile || '',
        userType: user.userType || 'Customer'
      });
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setMessage('');

    try {
      const updateData = {
        displayName: formData.displayName,
        userType: formData.userType
      };

      const response = await api.put('/users/profile', updateData);

      // Update localStorage with new user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Emit custom event to notify other components of profile update
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { user: updatedUser } 
      }));
      
      setIsEditing(false);
      setMessage('Profile updated successfully!');

    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (!user) {
    return <div className="loading">User not found</div>;
  }

  return (
    <div className="modern-app">
      {/* Modern Navigation */}
      <nav className="modern-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            👤 User Profile
          </div>
          <div className="navbar-nav">
            <Link to="/home" className="nav-link">
              🏠 Home
            </Link>
            <Link to="/my-referrals" className="nav-link">
              👥 My Referrals
            </Link>
            <button onClick={handleLogout} className="nav-button">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="profile-container">
        {message && (
          <div className={`message ${message.includes('successfully') ? 'success-message' : 'error-message'}`}>
            {message}
          </div>
        )}

        <div className="profile-card">
          <div className="profile-header">
            <h2>My Profile</h2>
            <button 
              onClick={handleEditToggle} 
              className={`edit-button ${isEditing ? 'cancel-button' : ''}`}
            >
              {isEditing ? '❌ Cancel' : '✏️ Edit Profile'}
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateProfile} className="edit-form">
              <div className="form-fields">
                <div className="form-group">
                  <label className="form-label">Full Name:</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    className="form-input readonly-input"
                    disabled
                    readOnly
                  />
                  <small className="form-help">Full name cannot be changed</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Display Name:</label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <small className="form-help">This name appears on your promotional images</small>
                </div>

                <div className="form-group">
                  <label className="form-label">Mobile Number:</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    className="form-input readonly-input"
                    disabled
                    readOnly
                  />
                  <small className="form-help">Mobile number cannot be changed</small>
                </div>

                <div className="form-group">
                  <label className="form-label">I am a:</label>
                  <select
                    name="userType"
                    value={formData.userType}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                    style={{
                      padding: '12px',
                      fontSize: '16px',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="CP">Channel Partner</option>
                    <option value="Customer">Customer</option>
                    <option value="Both">Both</option>
                  </select>
                  <small className="form-help">Update your position/role</small>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="save-button"
                  >
                    {updateLoading ? '💾 Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="profile-view">
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
                  <label>I am a:</label>
                  <span style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: user.userType === 'CP' ? '#dbeafe' : 
                                   user.userType === 'Customer' ? '#d1fae5' : '#fef3c7',
                    color: user.userType === 'CP' ? '#1e40af' : 
                           user.userType === 'Customer' ? '#065f46' : '#92400e'
                  }}>
                    {user.userType === 'CP' ? 'Channel Partner' : 
                     user.userType === 'Customer' ? 'Customer' : 'Both'}
                  </span>
                </div>

                <div className="info-group">
                  <label>Account Created:</label>
                  <span>{new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;