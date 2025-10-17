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
  
  // New state for nested table functionality
  const [drillDownData, setDrillDownData] = useState(null);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([]);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      // Fetch the logged-in user's network
      fetchUserNetwork(parsedUser.id);
    }

    // Listen for profile updates to refresh network data
    const handleProfileUpdate = (event) => {
      const updatedUser = event.detail.user;
      setUser(updatedUser);
      // Refresh network data to show updated names
      if (updatedUser.id) {
        fetchUserNetwork(updatedUser.id);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    // Cleanup event listener
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
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

  // Function to fetch users at a specific level
  // eslint-disable-next-line no-unused-vars
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

  // Handle row click for drill-down functionality
  const handleRowClick = async (branch) => {
    setDrillDownLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/users/referral-network/${branch.id}`);
      const drillDownNetwork = response.data.branches || [];
      
      // Update breadcrumb
      const rootUser = userNetwork.find(u => u.isRoot);
      const newBreadcrumb = [
        { id: rootUser?.id, name: rootUser?.name || 'Root' },
        { id: branch.id, name: branch.displayName || branch.name }
      ];
      
      setBreadcrumb(newBreadcrumb);
      setDrillDownData({
        user: branch,
        network: drillDownNetwork,
        level: 1
      });
    } catch (err) {
      console.error('Error fetching drill-down data:', err);
      setError('Failed to fetch user network details');
    } finally {
      setDrillDownLoading(false);
    }
  };

  // Close drill-down table
  const closeDrillDown = () => {
    setDrillDownData(null);
    setBreadcrumb([]);
  };

  // Handle drill-down row click (for nested levels)
  const handleDrillDownRowClick = async (branch) => {
    setDrillDownLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/users/referral-network/${branch.id}`);
      const nestedNetwork = response.data.branches || [];
      
      // Update breadcrumb
      const newBreadcrumb = [...breadcrumb, {
        id: branch.id,
        name: branch.displayName || branch.name
      }];
      
      setBreadcrumb(newBreadcrumb);
      setDrillDownData({
        user: branch,
        network: nestedNetwork,
        level: newBreadcrumb.length - 1
      });
    } catch (err) {
      console.error('Error fetching nested drill-down data:', err);
      setError('Failed to fetch user network details');
    } finally {
      setDrillDownLoading(false);
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
              <h2 className="section-title">Your Network </h2>
              <p className="section-subtitle">Complete overview of your referral network</p>
            </div>
          </div>

          {/* Network Loading */}
          {networkLoading && (
            <div className="network-loading">Loading network data...</div>
          )}

          {/* Network Table */}
          {!networkLoading && userNetwork.length > 0 && !drillDownData && (
            <div className="user-network-display">
              {(() => {
                const grandTotal = userNetwork.reduce((sum, branch) => sum + (branch.totalUsers || 0), 0);
                const rootUser = userNetwork.find(branch => branch.isRoot);
                
                return (
                  <div className="network-table-wrapper">
                    {/* Main User Header with Grand Total */}
                    <div className="main-user-header-section">
                      <div className="main-user-title">
                        {rootUser && rootUser.name}
                      </div>
                      <div className="grand-total-box">
                        <span className="grand-total-label">Grand total</span>
                        <span className="grand-total-value">{grandTotal}</span>
                      </div>
                    </div>

                    <div className="hierarchy-table-container">
                      <table className="hierarchy-table">
                        <thead>
                          <tr>
                            <th className="sr-no-header">Sr. No.</th>
                            <th className="level-header user-phone-header">User</th>
                            <th className="level-header">Level 1</th>
                            <th className="level-header">Level 2</th>
                            <th className="level-header">Level 3</th>
                            <th className="total-header">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userNetwork.map((branch, branchIndex) => {
                            // Skip root user from the table rows since it's in the header
                            if (branch.isRoot) return null;
                            
                            const serialNumber = userNetwork.filter(b => !b.isRoot).indexOf(branch) + 1;
                            
                            return (
                              <tr 
                                key={`${branch.id}-${branchIndex}`} 
                                className={`hierarchy-row ${branchIndex % 2 === 0 ? 'even' : 'odd'} clickable-row`}
                                onClick={() => handleRowClick(branch)}
                              >
                                <td className="sr-no-cell">
                                  {serialNumber}
                                </td>
                                <td className="level-1-cell user-phone-cell">
                                  <div className="branch-user-info">
                                    <div className="branch-user-name">
                                    {branch.displayName || branch.name}
                                    </div>
                                  </div>
                                </td>
                                <td className="level-count-cell level-1">
                                  {branch.level2 > 0 ? (
                                    <span className="count-display">View {branch.level2}</span>
                                  ) : (
                                    <span className="zero-count">0</span>
                                  )}
                                </td>
                                <td className="level-count-cell level-2">
                                  {branch.level3 > 0 ? (
                                    <span className="count-display">View {branch.level3}</span>
                                  ) : (
                                    <span className="zero-count">0</span>
                                  )}
                                </td>
                                <td className="level-count-cell level-3">
                                  {branch.level4 > 0 ? (
                                    <span className="count-display">View {branch.level4}</span>
                                  ) : (
                                    <span className="zero-count">0</span>
                                  )}
                                </td>
                                <td className="total-cell">
                                  <span className="total-count">{branch.totalUsers}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* No Network Data */}
          {!networkLoading && userNetwork.length === 0 && (
            <div className="no-network-data">
              <p>You have no referral network yet. Start inviting people to build your network!</p>
            </div>
          )}

          {/* Drill-Down Table */}
          {drillDownData && (
            <div className="user-network-display">
              <div className="drill-down-header">
                <div></div>
                <button className="close-drill-down" onClick={closeDrillDown}>
                  ← Back to Main Network
                </button>
              </div>

              {drillDownLoading ? (
                <div className="network-loading">Loading drill-down data...</div>
              ) : (
                <div>
                  {(() => {
                    const grandTotal = drillDownData.network.reduce((sum, branch) => sum + (branch.totalUsers || 0), 0);
                    const maxLevels = Math.max(1, 3 - drillDownData.level); // Minus-one level logic
                    // eslint-disable-next-line no-unused-vars
                    const currentUser = drillDownData.user;
                    
                    return (
                      <div className="network-table-wrapper">
                        {/* Drill-down User Header with Grand Total */}
                        <div className="main-user-header-section">
                          <div className="main-user-title">
                            {breadcrumb.map((crumb, index) => (
                              <span key={crumb.id}>
                                {index > 0 && ' – '}
                                {crumb.name}
                              </span>
                            ))}
                          </div>
                          <div className="grand-total-box">
                            <span className="grand-total-label">Grand total</span>
                            <span className="grand-total-value">{grandTotal}</span>
                          </div>
                        </div>

                        <div className="hierarchy-table-container">
                          <table className="hierarchy-table">
                            <thead>
                              <tr>
                                <th className="sr-no-header">Sr. No.</th>
                                <th className="level-header user-phone-header">Phone</th>
                                {maxLevels >= 1 && <th className="level-header">Level 1</th>}
                                {maxLevels >= 2 && <th className="level-header">Level 2</th>}
                                {maxLevels >= 3 && <th className="level-header">Level 3</th>}
                                <th className="total-header">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {drillDownData.network.map((branch, branchIndex) => {
                                // Skip root user from the table rows
                                if (branch.isRoot) return null;
                                
                                const serialNumber = drillDownData.network.filter(b => !b.isRoot).indexOf(branch) + 1;
                                
                                return (
                                  <tr 
                                    key={`drill-${branch.id}-${branchIndex}`} 
                                    className={`hierarchy-row ${branchIndex % 2 === 0 ? 'even' : 'odd'} ${maxLevels > 1 ? 'clickable-row' : ''}`}
                                    onClick={maxLevels > 1 ? () => handleDrillDownRowClick(branch) : undefined}
                                  >
                                    <td className="sr-no-cell">
                                      {serialNumber}
                                    </td>
                                    <td className="level-1-cell user-phone-cell">
                                      <div className="branch-user-info">
                                        <div className="branch-user-name">
                                          {branch.displayName || branch.name}
                                        </div>

                                      </div>
                                    </td>
                                    {maxLevels >= 1 && (
                                      <td className="level-count-cell level-1">
                                        {branch.level2 > 0 ? (
                                          <span className="count-display">View {branch.level2}</span>
                                        ) : (
                                          <span className="zero-count">0</span>
                                        )}
                                      </td>
                                    )}
                                    {maxLevels >= 2 && (
                                      <td className="level-count-cell level-2">
                                        {branch.level3 > 0 ? (
                                          <span className="count-display">View {branch.level3}</span>
                                        ) : (
                                          <span className="zero-count">0</span>
                                        )}
                                      </td>
                                    )}
                                    {maxLevels >= 3 && (
                                      <td className="level-count-cell level-3">
                                        {branch.level4 > 0 ? (
                                          <span className="count-display">View {branch.level4}</span>
                                        ) : (
                                          <span className="zero-count">0</span>
                                        )}
                                      </td>
                                    )}
                                    <td className="total-cell">
                                      <span className="total-count">{branch.totalUsers}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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
