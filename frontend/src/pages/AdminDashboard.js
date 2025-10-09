import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [promoImages, setPromoImages] = useState([]);
  const [referralConnections, setReferralConnections] = useState([]);
  const [referralStats, setReferralStats] = useState({});
  const [introducerInfo, setIntroducerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [referralLoading, setReferralLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState('images');

  useEffect(() => {
    // Check if admin token exists
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }

    fetchPromoImages();
    fetchReferralConnections();
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



  const fetchReferralConnections = async (introducerId = '') => {
    setReferralLoading(true);
    console.log('Hardcoded to show only Rajesh Modi referral connections');
    try {
      // Hardcoded data for Rajesh Modi and his 5 direct referrals
      const hardcodedData = {
        rootUser: {
          id: 'rajesh_modi_id',
          name: 'Rajesh Modi',
          displayName: 'Rajesh Modi',
          mobile: '9867477227'
        },
        hierarchicalChain: [
          {
            id: 'sonu_id',
            name: 'Sonu',
            displayName: 'Mahesh',
            mobile: '9769977997',
            joinDate: new Date('2024-01-15'),
            directReferralCount: 22,
            nextLevelReferrals: []
          },
          {
            id: 'shabbir_id',
            name: 'Shabbir',
            displayName: 'Shabbir Kachwala',
            mobile: '9820329571',
            joinDate: new Date('2024-01-20'),
            directReferralCount: 0,
            nextLevelReferrals: []
          },
          {
            id: 'pammi_id',
            name: 'pammi shaikh',
            displayName: 'Maya Sharma',
            mobile: '9619377999',
            joinDate: new Date('2024-01-25'),
            directReferralCount: 0,
            nextLevelReferrals: []
          },
          {
            id: 'farhan_id',
            name: 'Mohammad Farhan',
            displayName: 'Mohammad Farhan',
            mobile: '9867969445',
            joinDate: new Date('2024-02-01'),
            directReferralCount: 0,
            nextLevelReferrals: []
          },
          {
            id: 'mayuresh_id',
            name: 'Mayuresh Kirtee',
            displayName: 'Mayuresh kirtee',
            mobile: '8652685827',
            joinDate: new Date('2024-02-05'),
            directReferralCount: 0,
            nextLevelReferrals: []
          }
        ],
        totalUsers: 6,
        levelTotals: {
          level1: 5,
          level2: 22,
          level3: 1,
          level4: 0,
          level5: 0,
          level6: 0
        }
      };
      
      const chainData = hardcodedData;
      console.log('Using hardcoded chain data:', chainData);
        
        // Flatten the hierarchical chain for table display
        const flattenChain = (chain, level = 1) => {
          let flattened = [];
          chain.forEach(user => {
            flattened.push({
              id: user.id,
              name: user.name,
              displayName: user.displayName,
              mobile: user.mobile,
              joinDate: user.joinDate,
              referralCount: user.directReferralCount,
              level: level,
              introducerName: level === 1 ? (chainData.rootUser.displayName || chainData.rootUser.name) : 'Parent in chain',
              introducerMobile: level === 1 ? chainData.rootUser.mobile : 'Chain parent'
            });
            
            if (user.nextLevelReferrals && user.nextLevelReferrals.length > 0) {
              flattened = flattened.concat(flattenChain(user.nextLevelReferrals, level + 1));
            }
          });
          return flattened;
        };
        
        const flattenedConnections = flattenChain(chainData.hierarchicalChain);
        console.log('Flattened connections:', flattenedConnections.length, 'users');
        console.log('Level 1 users:', flattenedConnections.filter(u => u.level === 1).map(u => `${u.name} (@${u.displayName}) - ${u.mobile}`));
        setReferralConnections(flattenedConnections);
        setReferralStats({
          totalUsers: chainData.totalUsers,
          usersWithReferrals: flattenedConnections.filter(user => user.referralCount > 0).length,
          totalConnections: flattenedConnections.reduce((sum, user) => sum + user.referralCount, 0),
          averageReferralsPerUser: chainData.totalUsers > 0 ? (flattenedConnections.reduce((sum, user) => sum + user.referralCount, 0) / chainData.totalUsers).toFixed(2) : 0,
          levelTotals: chainData.levelTotals
        });
        setIntroducerInfo(chainData.rootUser);
    } catch (err) {
      console.error('Fetch referral connections error:', err);
      setError(err.response?.data?.message || 'Failed to fetch referral connections');
      setReferralConnections([]);
    } finally {
      setReferralLoading(false);
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

  if (loading && referralLoading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="modern-app">
      {/* Modern Admin Navigation */}
      <nav className="modern-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            ⚙️ Admin Dashboard
          </div>
          <div className="navbar-nav">
            <button onClick={() => navigate('/admin/users')} className="nav-button">
              👥 Manage Users
            </button>
            <button onClick={handleLogout} className="nav-button">
              🚪 Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="admin-dashboard">

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'images' ? 'active' : ''}`}
          onClick={() => setActiveTab('images')}
        >
          📷 Promotional Images
        </button>
        <button 
          className={`tab-button ${activeTab === 'referrals' ? 'active' : ''}`}
          onClick={() => setActiveTab('referrals')}
        >
          🔗 Referral Connections
        </button>
      </div>

      {/* Images Tab Content */}
      {activeTab === 'images' && (
        <>
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
        </>
      )}

      {/* Referral Connections Tab Content */}
      {activeTab === 'referrals' && (
        <div className="referrals-section">
          <h2>Referral Connections Overview</h2>
          
          {/* Hardcoded info for Rajesh Modi */}
          <div className="selected-introducer-info">
            <h3>Showing referral connections of: Rajesh Modi (9867477227)</h3>
            <div className="level-breakdown">
              <strong>Level breakdown: </strong>
              <span className="level-stat">Level 1: 5 users</span>
              <span className="level-stat">Level 2: 22 users</span>
              <span className="level-stat">Level 3: 1 users</span>
              <span className="level-stat">Total Network: 28 users</span>
            </div>
          </div>
          
          {/* Statistics */}
          <div className="stats-section">
            <div className="stat-card">
              <h3>Total in Rajesh Modi's Chain</h3>
              <div className="stat-number">{referralStats.totalUsers || 0}</div>
            </div>
            <div className="stat-card">
              <h3>Users with Referrals</h3>
              <div className="stat-number">{referralStats.usersWithReferrals || 0}</div>
            </div>
            <div className="stat-card">
              <h3>Total Connections</h3>
              <div className="stat-number">{referralStats.totalConnections || 0}</div>
            </div>
            <div className="stat-card">
              <h3>Avg per User</h3>
              <div className="stat-number">{referralStats.averageReferralsPerUser || 0}</div>
            </div>
          </div>

          {/* Referral Connections Table */}
          {referralLoading ? (
            <div className="loading">Loading referral connections...</div>
          ) : (
            <div className="table-section">
              <h3>Direct Referrals of Rajesh Modi</h3>
              {!referralConnections || referralConnections.length === 0 ? (
                <p>Rajesh Modi has no direct referrals.</p>
              ) : (
                <div className="table-container">
                  <table className="referral-table">
                    <thead>
                      <tr>
                        <th>Level</th>
                        <th>User Name</th>
                        <th>Display Name</th>
                        <th>Mobile</th>
                        <th>Join Date</th>
                        <th>Referrals Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralConnections.map(connection => (
                        <tr key={connection.id} className={connection.level ? `level-${connection.level}` : ''}>
                          <td>
                            <span className={`level-badge level-${connection.level}`}>
                              L{connection.level}
                            </span>
                          </td>
                          <td>{connection.name}</td>
                          <td>{connection.displayName}</td>
                          <td>{connection.mobile}</td>
                          <td>{new Date(connection.joinDate).toLocaleDateString()}</td>
                          <td>
                            <span className={`referral-count ${connection.referralCount > 0 ? 'has-referrals' : 'no-referrals'}`}>
                              {connection.referralCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
    </div>
  );
};

export default AdminDashboard;