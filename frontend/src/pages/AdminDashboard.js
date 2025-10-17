import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [promoImages, setPromoImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    // Check if admin token exists
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }

    fetchPromoImages();
  }, [navigate]);

  const fetchPromoImages = async () => {
    try {
      const response = await api.get('/admin/promo-images');
      setPromoImages(response.data.images || []);
    } catch (err) {
      console.error('Fetch promo images error:', err);
      setError(err.response?.data?.message || 'Failed to fetch promotional images');
      setPromoImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setUploadLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('promoImage', selectedFile);
      formData.append('title', title || 'Promotional Event');
      formData.append('description', description);

      await api.post('/admin/upload-promo-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Promotional image uploaded successfully! It will appear in the user table.');
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      
      // Reset form
      document.getElementById('upload-form').reset();
      
      // Refresh images list
      fetchPromoImages();

    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleActivate = async (imageId) => {
    try {
      await api.put(`/admin/promo-image/${imageId}/activate`);
      setSuccess('Image activated successfully!');
      fetchPromoImages();
    } catch (err) {
      setError('Failed to activate image');
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      await api.delete(`/admin/promo-image/${imageId}`);
      setSuccess('Image deleted successfully!');
      fetchPromoImages();
    } catch (err) {
      setError('Failed to delete image');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="modern-app">
      {/* Modern Admin Navigation */}
      <nav className="modern-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            Admin Dashboard
          </div>
          <div className="navbar-nav">
            <button onClick={() => navigate('/admin/users')} className="nav-button">
              Referral Network
            </button>
            <button onClick={() => navigate('/admin/all-users')} className="nav-button">
              All Users
            </button>
            <button onClick={handleLogout} className="nav-button">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="admin-dashboard">

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Upload Section */}
      <div className="upload-section">
            <h2>Upload Promotional Image</h2>
            <form id="upload-form" onSubmit={handleUpload} className="upload-form">
              <div className="form-group">
                <label className="form-label">Event Title:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Property Expo 2025, Business Summit, etc."
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional):</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the event"
                  className="form-input"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Select Promotional Image:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="form-input file-input"
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Upload the promotional image. User details will be automatically added for personalization. This image will be used for both English and Hindi versions.
                </small>
              </div>

              <button
                type="submit"
                disabled={uploadLoading}
                className="form-button"
              >
                {uploadLoading ? 'Uploading...' : 'Upload & Publish to Users'}
              </button>
            </form>
          </div>

          {/* Images List */}
          <div className="images-section">
            <h2>Promotional Images</h2>
            {!promoImages || promoImages.length === 0 ? (
              <p>No promotional images uploaded yet.</p>
            ) : (
              <div className="images-grid">
                {promoImages.map(image => (
                  <div key={image.id || image._id} className="image-card">
                    <img
                      src={`https://promotion-backend.onrender.com${image.imageUrl}`}
                      alt={image.originalName || 'Promotional Image'}
                      className="preview-image"
                    />
                    <div className="image-info">
                      <p><strong>Title:</strong> {image.title || 'Promotional Event'}</p>
                      {image.description && (
                        <p><strong>Description:</strong> {image.description}</p>
                      )}
                      <p><strong>File:</strong> {image.originalName || 'Unknown'}</p>
                      <p><strong>Event Date:</strong> {image.eventDate ? new Date(image.eventDate).toLocaleDateString() : 'Unknown'}</p>
                      <p><strong>Status:</strong> 
                        <span className={image.isActive ? 'active-status' : 'inactive-status'}>
                          {image.isActive ? ' Active (Visible to Users)' : ' Inactive'}
                        </span>
                      </p>
                      <p><strong>Uploaded:</strong> {image.createdAt ? new Date(image.createdAt).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                    <div className="image-actions">
                      {!image.isActive && (
                        <button
                          onClick={() => handleActivate(image.id || image._id)}
                          className="activate-button"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(image.id || image._id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
    </div>
    </div>
  );
};

export default AdminDashboard;