import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const MyReferrals = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userNetwork, setUserNetwork] = useState([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelUsers, setLevelUsers] = useState([]);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelLoading, setLevelLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      // Fetch the logged-in user's network
      fetchUserNetwork(parsedUser.id);
    }
  }, []);

  // Fetch referral network for logged-in user
  const fetchUserNetwork = async (userId) => {
    setNetworkLoading(true);
    try {
      const response = await api.get(`/users/referral-network/${userId}`);
      setUserNetwork(response.data.branches || []);
    } catch (err) {
      console.error('Error fetching user network:', err);
      setUserNetwork([]);
      setError('Failed to fetch your referral network');
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
            <Link to="/home" className="nav-link">
              🏠 Home
            </Link>
            <Link to="/my-referrals" className="nav-link active">
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
              to="/home" 
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              🏠 Home
            </Link>
            <Link 
              to="/my-referrals" 
              className="nav-link active"
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
            <h1 className="welcome-title">My Referral Network</h1>
            <p className="welcome-subtitle">View your complete referral network structure</p>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* My Referral Network Section */}
        <div className="user-search-section">
          <div className="section-header">
            <div style={{ textAlign: 'left' }}>
              <h2 className="section-title">Your Network Chainlink</h2>
              <p className="section-subtitle">Complete overview of your referral network</p>
            </div>
          </div>

          {/* Network Loading */}
          {networkLoading && (
            <div className="network-loading">Loading network data...</div>
          )}

          {/* Network Table */}
          {!networkLoading && userNetwork.length > 0 && (
            <div className="user-network-display">
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
              <p>You have no referral network yet. Start inviting people to build your network!</p>
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

export default MyReferrals;
