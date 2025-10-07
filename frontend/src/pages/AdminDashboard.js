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
  const [selectedType, setSelectedType] = useState('');

  const imageTypes = [
    { value: 'english-day1', label: 'English - Day 1 (27th Sept)' },
    { value: 'english-day2', label: 'English - Day 2 (28th Sept)' },
    { value: 'english-both', label: 'English - Both Days' },
    { value: 'hindi-day1', label: 'Hindi - Day 1 (27th Sept)' },
    { value: 'hindi-day2', label: 'Hindi - Day 2 (28th Sept)' },
    { value: 'hindi-both', label: 'Hindi - Both Days' }
  ];

  useEffect(() => {
    // Set admin token for API calls
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      api.defaults.headers.Authorization = `Bearer ${adminToken}`;
    } else {
      navigate('/admin/login');
      return;
    }

    fetchPromoImages();
  }, [navigate]);

  const fetchPromoImages = async () => {
    try {
      const response = await api.get('/admin/promo-images');
      setPromoImages(response.data.images);
    } catch (err) {
      setError('Failed to fetch promotional images');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile || !selectedType) {
      setError('Please select a file and image type');
      return;
    }

    setUploadLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('promoImage', selectedFile);
      formData.append('type', selectedType);

      await api.post('/admin/upload-promo-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess('Promotional image uploaded successfully!');
      setSelectedFile(null);
      setSelectedType('');
      
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
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Upload Section */}
      <div className="upload-section">
        <h2>Upload Promotional Image</h2>
        <form id="upload-form" onSubmit={handleUpload} className="upload-form">
          <div className="form-group">
            <label className="form-label">Select Base Promotional Image:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              required
              className="form-input file-input"
            />
            <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
              Upload the promotional image. User details will be automatically added to the bottom.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Image Type:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              required
              className="form-input"
            >
              <option value="">Choose which version this is for...</option>
              {imageTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={uploadLoading}
            className="form-button"
          >
            {uploadLoading ? 'Uploading...' : 'Upload Promotional Image'}
          </button>
        </form>
      </div>

      {/* Images List */}
      <div className="images-section">
        <h2>Promotional Images</h2>
        {promoImages.length === 0 ? (
          <p>No promotional images uploaded yet.</p>
        ) : (
          <div className="images-grid">
            {imageTypes.map(type => (
              <div key={type.value} className="image-type-section">
                <h3>{type.label}</h3>
                {promoImages
                  .filter(img => img.type === type.value)
                  .map(image => (
                    <div key={image.id} className="image-card">
                      <img
                        src={`http://localhost:5000${image.imageUrl}`}
                        alt={image.originalName}
                        className="preview-image"
                      />
                      <div className="image-info">
                        <p><strong>File:</strong> {image.originalName}</p>
                        <p><strong>Status:</strong> 
                          <span className={image.isActive ? 'active-status' : 'inactive-status'}>
                            {image.isActive ? ' Active' : ' Inactive'}
                          </span>
                        </p>
                        <p><strong>Uploaded:</strong> {new Date(image.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="image-actions">
                        {!image.isActive && (
                          <button
                            onClick={() => handleActivate(image.id)}
                            className="activate-button"
                          >
                            Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(image.id)}
                          className="delete-button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                {promoImages.filter(img => img.type === type.value).length === 0 && (
                  <p className="no-images">No images uploaded for this type</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;