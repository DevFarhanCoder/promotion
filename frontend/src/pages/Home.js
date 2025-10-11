import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [promoImages, setPromoImages] = useState([]);

  // Ranking Table States
  const [rankingData, setRankingData] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Network Modal States
  const [selectedUser, setSelectedUser] = useState(null);
  const [userNetwork, setUserNetwork] = useState([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelUsers, setLevelUsers] = useState([]);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelLoading, setLevelLoading] = useState(false);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      // Don't fetch logged-in user's network on Home page
      // User's network is now on My Referrals page
    }
    
    // Fetch promotional images
    fetchPromoImages();
    
    // Fetch ranking data
    fetchRankingData(1);
  }, []);

  const fetchPromoImages = async () => {
    try {
      const response = await api.get('/admin/public-images');
      setPromoImages(response.data.images || []);
    } catch (err) {
      console.error('Error fetching promotional images:', err);
      setPromoImages([]);
    }
  };

  // Fetch ranking data
  const fetchRankingData = async (page = 1) => {
    setRankingLoading(true);
    try {
      const response = await api.get(`/users/ranking?page=${page}&limit=10`);
      setRankingData(response.data.users || []);
      setPagination(response.data.pagination || {});
      setCurrentPage(page);
    } catch (err) {
      console.error('Error fetching ranking data:', err);
      setRankingData([]);
      setError('Failed to fetch ranking data');
    } finally {
      setRankingLoading(false);
    }
  };

  // Pagination handlers
  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      fetchRankingData(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevPage) {
      fetchRankingData(currentPage - 1);
    }
  };

  const handlePageClick = (pageNum) => {
    fetchRankingData(pageNum);
  };

  // Fetch user's referral network when clicking on total referrals
  const handleViewUserNetwork = async (user) => {
    setSelectedUser(user);
    setNetworkLoading(true);
    setShowNetworkModal(true);
    
    try {
      const response = await api.get(`/users/referral-network/${user._id}`);
      setUserNetwork(response.data.branches || []);
    } catch (err) {
      console.error('Error fetching user network:', err);
      setUserNetwork([]);
      setError('Failed to fetch user network');
    } finally {
      setNetworkLoading(false);
    }
  };

  // Fetch users at a specific level
  const fetchLevelUsers = async (branchUserId, level, branchUserName) => {
    setLevelLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/users/level-users/${branchUserId}/${level}`);
      if (response.data.success) {
        setLevelUsers(response.data.users || []);
        setSelectedLevel({
          branchUserId,
          level,
          branchUserName,
          branchUser: response.data.branchUser,
          totalUsers: response.data.totalUsers
        });
        setShowLevelModal(true);
      }
    } catch (err) {
      console.error('Fetch level users error:', err);
      setError(err.response?.data?.message || 'Failed to fetch level users');
    } finally {
      setLevelLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleDownload = async (imageId, language) => {
    const downloadKey = `${imageId}-${language}`;
    setLoadingStates(prev => ({ ...prev, [downloadKey]: true }));
    setError('');

    try {
      // Generate personalized image with specific image ID and language
      const response = await api.post('/images/generate', { 
        imageId: imageId,
        language: language
      });
      
      if (response.data.imageUrl) {
        // Use the download endpoint for forced download
        const filename = response.data.imageUrl.split('/').pop();
        const downloadUrl = `https://promotion-backend.onrender.com/download/${filename}`;
        
        // Use the user-friendly filename from backend
        const downloadFilename = response.data.userFriendlyFilename || 
          `${user.displayName}-${language}-promotional.png`;
        
        // Create download link
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate personalized image');
    } finally {
      setLoadingStates(prev => ({ ...prev, [downloadKey]: false }));
    }
  };

  const handleShare = async (imageId) => {
    const shareKey = `share-${imageId}`;
    setLoadingStates(prev => ({ ...prev, [shareKey]: true }));
    setError('');

    try {
      // Generate personalized image for sharing
      const response = await api.post('/images/generate', { 
        imageId: imageId,
        language: 'english' // Default to English for sharing
      });
      
      if (response.data.imageUrl) {
        const shareUrl = `https://promotion-backend.onrender.com${response.data.imageUrl}`;
        
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Promotional Image',
              text: `Check out my personalized promotional image!`,
              url: shareUrl,
            });
          } catch (err) {
            console.log('Error sharing:', err);
            // Fallback to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
              alert('Image URL copied to clipboard!');
            });
          }
        } else {
          // Fallback - copy to clipboard
          navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Image URL copied to clipboard!');
          });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate image for sharing');
    } finally {
      setLoadingStates(prev => ({ ...prev, [shareKey]: false }));
    }
  };

  if (!user) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="modern-app">
      {/* Modern Navigation Bar */}
      <nav className="modern-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <img src="/promotion-hub.png" alt="Promotion Hub" className="navbar-logo" />
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <div className="navbar-nav desktop-nav">
            <Link to="/my-referrals" className="nav-link">
              👥 My Referrals
            </Link>
            <Link to="/profile" className="nav-link">
              👤 Profile
            </Link>
            <button onClick={handleLogout} className="nav-button">
              Logout
            </button>
          </div>

          {/* Mobile Navigation */}
          <div className={`mobile-nav ${mobileMenuOpen ? 'active' : ''}`}>
            <Link 
              to="/my-referrals" 
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              👥 My Referrals
            </Link>
            <Link 
              to="/profile" 
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              👤 Profile
            </Link>
            <button 
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }} 
              className="nav-button"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="home-container">
        <div className="welcome-card">
          <div className="welcome-content">
            <h1 className="welcome-title">Welcome back, {user.displayName}!</h1>
            <p className="welcome-subtitle">Download your personalized promotional images</p>
          </div>
        </div>

      {error && <div className="error-message">{error}</div>}

      <div className="promo-table">
        <div className="table-header">
          <div className="table-row">
            <div className="table-cell">
              <div className="table-header-cell">Date</div>
            </div>
            <div className="table-cell">
              <div className="table-header-cell">English</div>
            </div>
            <div className="table-cell">
              <div className="table-header-cell">हिंदी</div>
            </div>
            <div className="table-cell">
              <div className="table-header-cell">Share</div>
            </div>
          </div>
        </div>

        {/* Dynamic Promotional Images */}
        {promoImages.length === 0 ? (
          <div className="table-row">
            <div className="table-cell" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: '#666', fontStyle: 'italic' }}>
                No promotional images available yet. Please check back later.
              </p>
            </div>
          </div>
        ) : (
          promoImages.map((image, index) => (
            <div key={image.id || index} className="table-row">
              <div className="table-cell">
                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                  {new Date(image.eventDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                  {image.title}
                </div>
              </div>
              <div className="table-cell">
                <button
                  onClick={() => handleDownload(image.id, 'english')}
                  disabled={loadingStates[`${image.id}-english`]}
                  className="download-button"
                >
                  {loadingStates[`${image.id}-english`] ? 'Generating...' : 'Download'}
                </button>
              </div>
              <div className="table-cell">
                <button
                  onClick={() => handleDownload(image.id, 'hindi')}
                  disabled={loadingStates[`${image.id}-hindi`]}
                  className="download-button"
                >
                  {loadingStates[`${image.id}-hindi`] ? 'तैयार कर रहे हैं...' : 'डाउनलोड'}
                </button>
              </div>
              <div className="table-cell">
                <button
                  onClick={() => handleShare(image.id)}
                  disabled={loadingStates[`share-${image.id}`]}
                  className="share-button"
                >
                  {loadingStates[`share-${image.id}`] ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dynamic User Search & Network Section */}
      <div className="user-search-section">
        <div className="section-header">
          <div style={{ textAlign: 'center', width: '100%' }}>
            <h2 className="section-title">Top Users Ranking</h2>
            <p className="section-subtitle">Users ranked by total number of referrals across the platform</p>
          </div>
        </div>

        {/* Ranking Table */}
        {rankingLoading ? (
          <div className="network-loading">Loading ranking data...</div>
        ) : (
          <>
            <div className="ranking-table-container">
              <table className="ranking-table">
                <thead>
                  <tr>
                    <th className="rank-header">Rank</th>
                    <th className="name-header">Name</th>
                    <th className="badge-header">Badge</th>
                    <th className="referrals-header">Total Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingData.map((user, index) => {
                    const rowClass = user.rank === 1 ? 'gold-row' : 
                                    user.rank === 2 ? 'silver-row' : 
                                    user.rank === 3 ? 'bronze-row' : 
                                    (index % 2 === 0 ? 'even-row' : 'odd-row');
                    
                    return (
                      <tr key={user._id} className={rowClass}>
                        <td className="rank-cell">
                          <span className="rank-number">
                            {user.rank}
                          </span>
                        </td>
                        <td className="name-cell">
                          <div className="user-info">
                            <div className="user-name">{user.displayName || user.name}</div>
                          </div>
                        </td>
                        <td className="badge-cell">
                          {user.rank === 1 ? (
                            <div className="rank-badge-tag gold-badge">
                              <span className="badge-icon">👑</span>
                              <span className="badge-label">Gold</span>
                            </div>
                          ) : user.rank === 2 ? (
                            <div className="rank-badge-tag silver-badge">
                              <span className="badge-icon">🥈</span>
                              <span className="badge-label">Silver</span>
                            </div>
                          ) : user.rank === 3 ? (
                            <div className="rank-badge-tag bronze-badge">
                              <span className="badge-icon">🥉</span>
                              <span className="badge-label">Bronze</span>
                            </div>
                          ) : null}
                        </td>
                        <td className="referrals-cell">
                          <button
                            className="referrals-count clickable"
                            onClick={() => handleViewUserNetwork(user)}
                            title="Click to view referral network"
                          >
                            {user.totalReferrals}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination-container">
                <button
                  className="pagination-btn"
                  onClick={handlePrevPage}
                  disabled={!pagination.hasPrevPage}
                >
                  ← Previous
                </button>

                <div className="pagination-pages">
                  {[...Array(pagination.totalPages)].map((_, index) => {
                    const pageNum = index + 1;
                    // Show first 3 pages, current page with neighbors, and last 3 pages
                    if (
                      pageNum <= 3 ||
                      pageNum >= pagination.totalPages - 2 ||
                      (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          className={`pagination-page ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => handlePageClick(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === 4 && currentPage > 5 ||
                      pageNum === pagination.totalPages - 3 && currentPage < pagination.totalPages - 4
                    ) {
                      return <span key={pageNum} className="pagination-ellipsis">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  className="pagination-btn"
                  onClick={handleNextPage}
                  disabled={!pagination.hasNextPage}
                >
                  Next →
                </button>
              </div>
            )}

            {/* Pagination Info */}
            <div className="pagination-info">
              Showing {rankingData.length > 0 ? ((currentPage - 1) * 10) + 1 : 0} - {Math.min(currentPage * 10, pagination.totalUsers)} of {pagination.totalUsers} users
            </div>
          </>
        )}
      </div>

      {/* User Network Modal */}
      {showNetworkModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowNetworkModal(false)}>
          <div className="network-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {selectedUser.displayName || selectedUser.name}'s Referral Network
              </h3>
              <button 
                className="modal-close"
                onClick={() => setShowNetworkModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {networkLoading ? (
                <div className="loading">Loading network data...</div>
              ) : (
                <div className="network-content">
                  {userNetwork.length > 0 ? (
                    <div className="hierarchy-table-container">
                      <table className="hierarchy-table">
                        <thead>
                          <tr>
                            <th className="level-header">Level 1 (User)</th>
                            <th className="level-header">Level 2</th>
                            <th className="level-header">Level 3</th>
                            <th className="level-header">Level 4</th>
                            <th className="level-header">Level 5</th>
                            <th className="level-header">Level 6</th>
                            <th className="total-header">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userNetwork.map((branch, branchIndex) => (
                            <tr 
                              key={`${branch.id}-${branchIndex}`} 
                              className={`hierarchy-row ${branchIndex % 2 === 0 ? 'even' : 'odd'} ${branch.isRoot ? 'root-branch' : 'user-branch'}`}
                            >
                              <td className="level-1-cell">
                                <div className="branch-user-info">
                                  <div className="branch-user-name">
                                    {branch.isRoot && <span className="root-indicator">👑 </span>}
                                    {branch.displayName || branch.name}
                                  </div>
                                </div>
                              </td>
                              <td className="level-count-cell level-2">
                                {branch.level2 > 0 ? (
                                  <button
                                    className="count-button level-2-btn"
                                    onClick={() => fetchLevelUsers(branch.id, 2, branch.name)}
                                    disabled={levelLoading}
                                  >
                                    View {branch.level2}
                                  </button>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="level-count-cell level-3">
                                {branch.level3 > 0 ? (
                                  <button
                                    className="count-button level-3-btn"
                                    onClick={() => fetchLevelUsers(branch.id, 3, branch.name)}
                                    disabled={levelLoading}
                                  >
                                    View {branch.level3}
                                  </button>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="level-count-cell level-4">
                                {branch.level4 > 0 ? (
                                  <button
                                    className="count-button level-4-btn"
                                    onClick={() => fetchLevelUsers(branch.id, 4, branch.name)}
                                    disabled={levelLoading}
                                  >
                                    View {branch.level4}
                                  </button>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="level-count-cell level-5">
                                {branch.level5 > 0 ? (
                                  <button
                                    className="count-button level-5-btn"
                                    onClick={() => fetchLevelUsers(branch.id, 5, branch.name)}
                                    disabled={levelLoading}
                                  >
                                    View {branch.level5}
                                  </button>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="level-count-cell level-6">
                                {branch.level6 > 0 ? (
                                  <button
                                    className="count-button level-6-btn"
                                    onClick={() => fetchLevelUsers(branch.id, 6, branch.name)}
                                    disabled={levelLoading}
                                  >
                                    View {branch.level6}
                                  </button>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="total-cell">
                                <span className="total-count">{branch.totalUsers}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>This user has no referral network yet.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Level Users Modal */}
      {showLevelModal && selectedLevel && (
        <div className="modal-overlay" onClick={() => setShowLevelModal(false)}>
          <div className="level-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Level {selectedLevel.level} Users under {selectedLevel.branchUserName}
              </h3>
              <button 
                className="modal-close"
                onClick={() => setShowLevelModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {levelLoading ? (
                <div className="loading">Loading level users...</div>
              ) : (
                <div className="level-users-content">
                  <div className="level-info">
                    <p><strong>Total Users:</strong> {selectedLevel.totalUsers}</p>
                  </div>

                  {levelUsers.length > 0 ? (
                    <div className="level-users-table-container">
                      <table className="level-users-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Joined Date</th>
                            <th>Introducer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {levelUsers.map((user, index) => (
                            <tr key={user._id}>
                              <td>{index + 1}</td>
                              <td>
                                {user.displayName || user.name}
                              </td>
                              <td>
                                {new Date(user.createdAt).toLocaleDateString('en-US', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </td>
                              <td>{user.introducerName || user.introducer?.displayName || user.introducer?.name || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p>No users found at this level.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
};

export default Home;