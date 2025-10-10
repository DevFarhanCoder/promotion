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
  const [referralChain, setReferralChain] = useState([]);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    directReferrals: 0
  });

  // Dynamic User Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userNetwork, setUserNetwork] = useState([]);
  const [networkLoading, setNetworkLoading] = useState(false);
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
      // Fetch the logged-in user's network initially
      fetchUserNetwork(parsedUser.id);
    }
    
    // Fetch promotional images and referral chain
    fetchPromoImages();
    fetchReferralChain();
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

  const fetchReferralChain = async () => {
    try {
      const response = await api.get('/users/my-referral-chain');
      setReferralChain(response.data.referralChain || []);
      setReferralStats({
        totalReferrals: response.data.stats?.totalReferrals || 0,
        directReferrals: response.data.stats?.directReferrals || 0
      });
    } catch (err) {
      console.error('Error fetching referral chain:', err);
      setReferralChain([]);
    }
  };

  // Search for users
  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(`/users/search-all?query=${query}`);
      setSearchResults(response.data.users || []);
      setShowSearchDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Select a user and fetch their network
  const selectUser = async (user) => {
    setSelectedUser(user);
    setSearchQuery(`${user.displayName || user.name} (${user.mobile})`);
    setShowSearchDropdown(false);
    setSearchResults([]);
    
    // Fetch the user's referral network
    await fetchUserNetwork(user._id);
  };

  // Fetch referral network for selected user
  const fetchUserNetwork = async (userId) => {
    setNetworkLoading(true);
    try {
      const response = await api.get(`/users/referral-network/${userId}`);
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

  // Clear selected user
  const clearUserSelection = () => {
    setSelectedUser(null);
    setSearchQuery('');
    // Reload logged-in user's network
    if (user?.id) {
      fetchUserNetwork(user.id);
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
            <h1 className="welcome-title">Welcome back, {user.displayName}! 👋</h1>
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

      {/* Referral Chain Section */}
      <div className="referral-chain-section">
        <div className="section-header">
          <h2 className="section-title">My Referral Network</h2>
          <p className="section-subtitle">People who joined through your referral</p>
        </div>

        {/* Referral Stats */}
        <div className="referral-stats-cards">
          <div className="stats-card">
            <div className="stats-number">{referralStats.directReferrals}</div>
            <div className="stats-label">Direct Referrals</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{referralStats.totalReferrals}</div>
            <div className="stats-label">Total Network</div>
          </div>
        </div>

        {/* Referral Chain Table */}
        {referralChain.length === 0 ? (
          <div className="no-referrals">
            <p>You haven't referred anyone yet. Share your referral link to grow your network!</p>
          </div>
        ) : (
          <div className="referral-table-container">
            <table className="referral-chain-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Joined Date</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {referralChain.map((referral, index) => (
                  <tr key={referral._id} className={`level-${referral.level}`}>
                    <td>{index + 1}</td>
                    <td className="name-cell">
                      <div className="referral-name">{referral.name}</div>
                      {referral.level > 1 && (
                        <div className="referral-path">via {referral.introducerName}</div>
                      )}
                    </td>
                    <td className="date-cell">
                      {new Date(referral.joinedDate).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="level-cell">
                      <span className={`level-badge level-${referral.level}`}>
                        Level {referral.level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic User Search & Network Section */}
      <div className="user-search-section">
        <div className="section-header">
          <h2 className="section-title">Search User Network</h2>
          <p className="section-subtitle">View any user's referral network structure</p>
        </div>

        {/* Search Bar */}
        <div className="search-container" style={{ position: 'relative', marginBottom: '2rem' }}>
          <div className="search-input-wrapper">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              placeholder="Search by name or phone number..."
              className="network-search-input"
              autoComplete="off"
            />
            {selectedUser && (
              <button onClick={clearUserSelection} className="clear-search-btn">
                ✕ Clear
              </button>
            )}
          </div>

          {/* Search Loading */}
          {searchLoading && (
            <div className="search-loading">Searching...</div>
          )}

          {/* Search Results Dropdown */}
          {showSearchDropdown && searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map(user => (
                <div
                  key={user._id}
                  onClick={() => selectUser(user)}
                  className="search-result-item"
                >
                  <div className="result-name">{user.displayName || user.name}</div>
                  <div className="result-mobile">{user.mobile}</div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {showSearchDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !searchLoading && (
            <div className="search-dropdown">
              <div className="no-results">No users found</div>
            </div>
          )}
        </div>

        {/* Network Loading */}
        {networkLoading && (
          <div className="network-loading">Loading network data...</div>
        )}

        {/* Network Table - Always visible, shows logged-in user's network by default */}
        {!networkLoading && userNetwork.length > 0 && (
          <div className="user-network-display">
            <div className="selected-user-info">
              <h3>
                Network for: <strong>{selectedUser ? (selectedUser.displayName || selectedUser.name) : (user?.displayName || user?.name || 'You')}</strong>
              </h3>
              <p>Mobile: {selectedUser ? selectedUser.mobile : (user?.mobile || 'N/A')}</p>
              {selectedUser && (
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.9 }}>
                  Viewing selected user's network
                </p>
              )}
              {!selectedUser && (
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.9 }}>
                  Your network (search to view another user's network)
                </p>
              )}
            </div>

            <div className="hierarchy-table-container">
              <table className="hierarchy-table">
                <thead>
                  <tr>
                    <th className="level-header">Level 1 (User + Phone)</th>
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
                            {branch.name}
                          </div>
                          <div className="branch-user-meta">
                            <span className="branch-display">@{branch.displayName}</span>
                            <span className="branch-mobile">{branch.mobile}</span>
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
          </div>
        )}

        {/* No Network Data */}
        {!networkLoading && userNetwork.length === 0 && (
          <div className="no-network-data">
            <p>{selectedUser ? 'This user has no referral network yet.' : 'You have no referral network yet.'}</p>
          </div>
        )}
      </div>

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
                            <th>Display Name</th>
                            <th>Mobile</th>
                            <th>Joined Date</th>
                            <th>Introducer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {levelUsers.map((user, index) => (
                            <tr key={user._id}>
                              <td>{index + 1}</td>
                              <td>{user.name}</td>
                              <td>{user.displayName}</td>
                              <td>{user.mobile}</td>
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