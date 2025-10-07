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
    mobile: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
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
        mobile: userObj.mobile || ''
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

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setMessage('');
    if (!isEditing) {
      // Reset form data when starting edit
      setFormData({
        name: user.name || '',
        displayName: user.displayName || '',
        mobile: user.mobile || ''
      });
      setSelectedFile(null);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdateLoading(true);
    setMessage('');

    try {
      const updateData = new FormData();
      updateData.append('name', formData.name);
      updateData.append('displayName', formData.displayName);
      updateData.append('mobile', formData.mobile);
      
      if (selectedFile) {
        updateData.append('profilePhoto', selectedFile);
      }

      const response = await api.put('/users/profile', updateData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update localStorage with new user data
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setIsEditing(false);
      setSelectedFile(null);
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
            <button onClick={handleLogout} className="nav-button">
              🚪 Logout
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
              <div className="profile-photo-section">
                <div className="photo-upload">
                  {user.profilePhoto ? (
                    <img 
                      src={`http://localhost:5000/uploads/${user.profilePhoto}`}
                      alt="Profile"
                      className="profile-photo-preview"
                    />
                  ) : (
                    <div className="no-photo-placeholder">
                      📷
                    </div>
                  )}
                  <div className="photo-upload-controls">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="file-input"
                      id="profilePhoto"
                    />
                    <label htmlFor="profilePhoto" className="photo-upload-button">
                      📁 Change Photo
                    </label>
                    {selectedFile && (
                      <p className="file-selected">
                        ✅ {selectedFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-fields">
                <div className="form-group">
                  <label className="form-label">Full Name:</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
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
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
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
              <div className="profile-photo-section">
                {user.profilePhoto ? (
                  <img 
                    src={`http://localhost:5000/uploads/${user.profilePhoto}`}
                    alt="Profile"
                    className="profile-photo-display"
                  />
                ) : (
                  <div className="no-photo-display">
                    <span>👤</span>
                    <p>No Photo</p>
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