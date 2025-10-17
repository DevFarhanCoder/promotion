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

  // User's Network States
  const [userNetwork, setUserNetwork] = useState([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [drillDownData, setDrillDownData] = useState(null);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([]);
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
      // Fetch the logged-in user's network
      fetchUserNetwork(parsedUser.id);
    }
    
    // Fetch promotional images
    fetchPromoImages();

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

  const fetchPromoImages = async () => {
    try {
      const response = await api.get('/admin/public-images');
      setPromoImages(response.data.images || []);
    } catch (err) {
      console.error('Error fetching promotional images:', err);
      setPromoImages([]);
    }
  };

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

  // Handle View button click for specific level and user type
  const handleViewClick = async (branch, level, userType) => {
    setLevelLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/users/level-users/${branch.id}/${level}?userType=${userType}`);
      if (response.data.success) {
        setLevelUsers(response.data.users || []);
        setSelectedLevel({
          branchUserId: branch.id,
          level,
          branchUserName: branch.displayName || branch.name,
          branchUser: response.data.branchUser,
          totalUsers: response.data.totalUsers,
          userType
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
        // Download Base64 image directly
        const downloadFilename = response.data.userFriendlyFilename || 
          `${user.displayName}-${language}-promotional.png`;
        
        // Create download link from Base64 data URL
        const link = document.createElement('a');
        link.href = response.data.imageUrl; // Base64 data URL
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
        // For Base64 images, we can share via Web Share API if supported
        if (navigator.share && response.data.base64) {
          try {
            // Convert Base64 to Blob for sharing
            const byteString = atob(response.data.base64);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: 'image/png' });
            const file = new File([blob], response.data.userFriendlyFilename || 'promotional.png', { type: 'image/png' });
            
            await navigator.share({
              title: 'Promotional Image',
              text: `Check out my personalized promotional image!`,
              files: [file]
            });
          } catch (err) {
            console.log('Error sharing:', err);
            // Fallback - download image
            alert('Sharing not supported. Image will be downloaded instead.');
            const link = document.createElement('a');
            link.href = response.data.imageUrl;
            link.download = response.data.userFriendlyFilename || 'promotional.png';
            link.click();
          }
        } else {
          // Fallback - download image
          alert('Sharing not supported. Image will be downloaded instead.');
          const link = document.createElement('a');
          link.href = response.data.imageUrl;
          link.download = response.data.userFriendlyFilename || 'promotional.png';
          link.click();
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
            <Link to="/all-users-management" className="nav-link">
              👥 All Users Management
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
              to="/all-users-management" 
              className="nav-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              👥 All Users Management
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
              // Calculate grand totals from non-root users only (visible table rows) - using same logic as table totals
              const nonRootBranches = userNetwork.filter(branch => !branch.isRoot);
              // Level 1 - Count user types themselves
              const level1CpTotal = nonRootBranches.filter(branch => branch.userType === 'CP' || branch.userType === 'Both').length;
              const level1CustomerTotal = nonRootBranches.filter(branch => branch.userType === 'Customer' || branch.userType === 'Both').length;
              // Level 2-4 - Count referrals
              const level2CpTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level2?.cp || 0), 0);
              const level2CustomerTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level2?.customer || 0), 0);
              const level3CpTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level3?.cp || 0), 0);
              const level3CustomerTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level3?.customer || 0), 0);
              const level4CpTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level4?.cp || 0), 0);
              const level4CustomerTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level4?.customer || 0), 0);
              const grandTotalCp = level1CpTotal + level2CpTotal + level3CpTotal + level4CpTotal;
              const grandTotalCustomer = level1CustomerTotal + level2CustomerTotal + level3CustomerTotal + level4CustomerTotal;
              const grandTotal = grandTotalCp + grandTotalCustomer;
              const rootUser = userNetwork.find(branch => branch.isRoot);
              
              return (
                <div className="network-table-wrapper">
                  {/* Main User Header with Grand Total */}
                  <div className="main-user-header-section">
                    <div className="main-user-title">
                      {rootUser && rootUser.name}
                    </div>
                    {/* <div className="grand-total-box">
                      <span className="grand-total-label">Grand total</span>
                      <div className="grand-total-breakdown">
                        <span className="grand-total-value">{grandTotal}</span>
                        <div className="grand-total-details">
                          CP: {grandTotalCp} | Cust: {grandTotalCustomer}
                        </div>
                      </div>
                    </div> */}
                  </div>

                  <div className="hierarchy-table-container">
                    <table className="hierarchy-table">
                      <thead>
                        {/* Main Header Row */}
                        <tr>
                          <th className="sr-no-header" rowSpan="4">S No</th>
                          <th className="level-header user-phone-header" rowSpan="4">User</th>
                          <th className="level-header user-phone-header" rowSpan="1">     </th>
                          <th className="level-header-group" colSpan="2">Level 1</th>
                          <th className="level-header-group" colSpan="2">Level 2</th>
                          <th className="level-header-group" colSpan="2">Level 3</th>
                          <th className="level-header-group" colSpan="2">Level 4</th>
                          <th className="level-header-group" colSpan="2">Total</th>
                        </tr>
                        
                        {/* Total Combined Row */}
                        {(() => {
                          const nonRootBranches = userNetwork.filter(branch => !branch.isRoot);
                          // Level 1 shows count of users themselves
                          const level1Total = nonRootBranches.length;
                          // Level 2-4 show referral counts
                          const level2Total = nonRootBranches.reduce((sum, branch) => sum + (branch.level2?.cp || 0) + (branch.level2?.customer || 0), 0);
                          const level3Total = nonRootBranches.reduce((sum, branch) => sum + (branch.level3?.cp || 0) + (branch.level3?.customer || 0), 0);
                          const level4Total = nonRootBranches.reduce((sum, branch) => sum + (branch.level4?.cp || 0) + (branch.level4?.customer || 0), 0);
                          const grandTotal = level1Total + level2Total + level3Total + level4Total;
                          
                          return (
                            <tr className="total-header-row combined-totals">
                              <th className="grand-total-label-cell">Grand Total</th>
                              <th className="total-header-cell" colSpan="2">{level1Total}</th>
                              <th className="total-header-cell" colSpan="2">{level2Total}</th>
                              <th className="total-header-cell" colSpan="2">{level3Total}</th>
                              <th className="total-header-cell" colSpan="2">{level4Total}</th>
                              <th className="total-header-cell" colSpan="2">{grandTotal}</th>
                            </tr>
                          );
                        })()}
                        
                        {/* Total Separate CP/Cust Row */}
                        {(() => {
                          const nonRootBranches = userNetwork.filter(branch => !branch.isRoot);
                          // Level 1 - Count user types themselves
                          const level1CpTotal = nonRootBranches.filter(branch => branch.userType === 'CP' || branch.userType === 'Both').length;
                          const level1CustomerTotal = nonRootBranches.filter(branch => branch.userType === 'Customer' || branch.userType === 'Both').length;
                          // Level 2-4 - Count referrals
                          const level2CpTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level2?.cp || 0), 0);
                          const level2CustomerTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level2?.customer || 0), 0);
                          const level3CpTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level3?.cp || 0), 0);
                          const level3CustomerTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level3?.customer || 0), 0);
                          const level4CpTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level4?.cp || 0), 0);
                          const level4CustomerTotal = nonRootBranches.reduce((sum, branch) => sum + (branch.level4?.customer || 0), 0);
                          const totalCp = level1CpTotal + level2CpTotal + level3CpTotal + level4CpTotal;
                          const totalCustomer = level1CustomerTotal + level2CustomerTotal + level3CustomerTotal + level4CustomerTotal;
                          
                          return (
                            <tr className="total-header-row separate-totals">
                              <th className="total-label-cell">Total</th>
                              <th className="total-header-cell cp-total">{level1CpTotal}</th>
                              <th className="total-header-cell customer-total">{level1CustomerTotal}</th>
                              <th className="total-header-cell cp-total">{level2CpTotal}</th>
                              <th className="total-header-cell customer-total">{level2CustomerTotal}</th>
                              <th className="total-header-cell cp-total">{level3CpTotal}</th>
                              <th className="total-header-cell customer-total">{level3CustomerTotal}</th>
                              <th className="total-header-cell cp-total">{level4CpTotal}</th>
                              <th className="total-header-cell customer-total">{level4CustomerTotal}</th>
                              <th className="total-header-cell cp-total">{totalCp}</th>
                              <th className="total-header-cell customer-total">{totalCustomer}</th>
                            </tr>
                          );
                        })()}
                        
                        {/* CP/Cust Labels Row */}
                        <tr className="total-header-row label-row">
                          <th className="mobile-no-label-cell">Mobile No</th>
                          <th className="sub-level-header cp-label">CP</th>
                          <th className="sub-level-header customer-label">Cust</th>
                          <th className="sub-level-header cp-label">CP</th>
                          <th className="sub-level-header customer-label">Cust</th>
                          <th className="sub-level-header cp-label">CP</th>
                          <th className="sub-level-header customer-label">Cust</th>
                          <th className="sub-level-header cp-label">CP</th>
                          <th className="sub-level-header customer-label">Cust</th>
                          <th className="sub-level-header cp-label">CP</th>
                          <th className="sub-level-header customer-label">Cust</th>
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
                              <td className="mobile-cell">
                                {branch.mobile || 'N/A'}
                              </td>
                              {/* Level 1 - Show user's own type */}
                              <td className="level-count-cell cp-cell">
                                {branch.userType === 'CP' || branch.userType === 'Both' ? (
                                  <span className="own-type-count">1</span>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="level-count-cell customer-cell">
                                {branch.userType === 'Customer' || branch.userType === 'Both' ? (
                                  <span className="own-type-count">1</span>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              {/* Level 2 CP/Customer - Direct referrals */}
                              <td className="level-count-cell cp-cell">
                                {branch.level2?.cp > 0 ? (
                                  <span className="count-number" onClick={(e) => { e.stopPropagation(); handleViewClick(branch, 2, 'CP'); }}>
                                    {branch.level2.cp}
                                  </span>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="level-count-cell customer-cell">
                                {branch.level2?.customer > 0 ? (
                                  <span className="count-number" onClick={(e) => { e.stopPropagation(); handleViewClick(branch, 2, 'Customer'); }}>
                                    {branch.level2.customer}
                                  </span>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              {/* Level 3 CP/Customer */}
                              <td className="level-count-cell cp-cell">
                                {branch.level3?.cp > 0 ? (
                                  <span className="count-number" onClick={(e) => { e.stopPropagation(); handleViewClick(branch, 3, 'CP'); }}>
                                    {branch.level3.cp}
                                  </span>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="level-count-cell customer-cell">
                                {branch.level3?.customer > 0 ? (
                                  <span className="count-number" onClick={(e) => { e.stopPropagation(); handleViewClick(branch, 3, 'Customer'); }}>
                                    {branch.level3.customer}
                                  </span>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              {/* Level 4 CP/Customer */}
                              <td className="level-count-cell cp-cell">
                                {branch.level4?.cp > 0 ? (
                                  <span className="count-number" onClick={(e) => { e.stopPropagation(); handleViewClick(branch, 4, 'CP'); }}>
                                    {branch.level4.cp}
                                  </span>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              <td className="level-count-cell customer-cell">
                                {branch.level4?.customer > 0 ? (
                                  <span className="count-number" onClick={(e) => { e.stopPropagation(); handleViewClick(branch, 4, 'Customer'); }}>
                                    {branch.level4.customer}
                                  </span>
                                ) : (
                                  <span className="zero-count">0</span>
                                )}
                              </td>
                              {/* Total CP/Customer */}
                              <td className="total-cell cp-total">
                                <span className="total-count">{branch.totalCp || 0}</span>
                              </td>
                              <td className="total-cell customer-total">
                                <span className="total-count">{branch.totalCustomer || 0}</span>
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
                  // Calculate grand total from non-root users only (visible table rows)
                  const nonRootBranches = drillDownData.network.filter(branch => !branch.isRoot);
                  const grandTotal = nonRootBranches.reduce((sum, branch) => {
                    // Get total from branch.totalUsers if available, or calculate from levels
                    if (branch.totalUsers && typeof branch.totalUsers === 'number') {
                      return sum + branch.totalUsers;
                    }
                    
                    // Calculate from totalCp and totalCustomer if available
                    if (branch.totalCp !== undefined || branch.totalCustomer !== undefined) {
                      return sum + (branch.totalCp || 0) + (branch.totalCustomer || 0);
                    }
                    
                    // Fallback: calculate from levels
                    let levelSum = 1; // Count the user themselves
                    if (branch.level2 && typeof branch.level2 === 'object') {
                      levelSum += (branch.level2.cp || 0) + (branch.level2.customer || 0);
                    } else if (branch.level2 && typeof branch.level2 === 'number') {
                      levelSum += branch.level2;
                    }
                    
                    if (branch.level3 && typeof branch.level3 === 'object') {
                      levelSum += (branch.level3.cp || 0) + (branch.level3.customer || 0);
                    } else if (branch.level3 && typeof branch.level3 === 'number') {
                      levelSum += branch.level3;
                    }
                    
                    if (branch.level4 && typeof branch.level4 === 'object') {
                      levelSum += (branch.level4.cp || 0) + (branch.level4.customer || 0);
                    } else if (branch.level4 && typeof branch.level4 === 'number') {
                      levelSum += branch.level4;
                    }
                    
                    return sum + levelSum;
                  }, 0);
                  const maxLevels = Math.max(1, 3 - drillDownData.level); // Minus-one level logic
                  
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
                        {/* <div className="grand-total-box">
                          <span className="grand-total-label">Grand total</span>
                          <span className="grand-total-value">{grandTotal}</span>
                        </div> */}
                      </div>

                      <div className="hierarchy-table-container">
                        <table className="hierarchy-table">
                          <thead>
                            {/* Main Header Row for next levels*/}
                            <tr>
                              <th className="sr-no-header" rowSpan="4">S No</th>
                              <th className="level-header user-phone-header" rowSpan="1"> </th>
                              <th className="level-header-group" colSpan="2">Level 1</th>
                              <th className="level-header-group" colSpan="2">Level 2</th>
                              <th className="level-header-group" colSpan="2">Level 3</th>
                              <th className="level-header-group" colSpan="2">Level 4</th>
                              <th className="level-header-group" colSpan="2">Total</th>
                            </tr>
                            
                            {/* Grand Total Row for drill-down */}
                            {(() => {
                              const nonRootBranches = drillDownData.network.filter(branch => !branch.isRoot);
                              // Calculate totals for drill-down data
                              const level1Total = nonRootBranches.length;
                              
                              // Calculate level totals - ensure we get numbers only
                              const level2Total = nonRootBranches.reduce((sum, branch) => {
                                let level2Count = 0;
                                if (branch.level2 && typeof branch.level2 === 'object') {
                                  level2Count = (branch.level2.cp || 0) + (branch.level2.customer || 0);
                                } else if (branch.level2 && typeof branch.level2 === 'number') {
                                  level2Count = branch.level2;
                                }
                                return sum + level2Count;
                              }, 0);
                              
                              const level3Total = nonRootBranches.reduce((sum, branch) => {
                                let level3Count = 0;
                                if (branch.level3 && typeof branch.level3 === 'object') {
                                  level3Count = (branch.level3.cp || 0) + (branch.level3.customer || 0);
                                } else if (branch.level3 && typeof branch.level3 === 'number') {
                                  level3Count = branch.level3;
                                }
                                return sum + level3Count;
                              }, 0);
                              
                              const level4Total = nonRootBranches.reduce((sum, branch) => {
                                let level4Count = 0;
                                if (branch.level4 && typeof branch.level4 === 'object') {
                                  level4Count = (branch.level4.cp || 0) + (branch.level4.customer || 0);
                                } else if (branch.level4 && typeof branch.level4 === 'number') {
                                  level4Count = branch.level4;
                                }
                                return sum + level4Count;
                              }, 0);
                              
                              const grandTotal = level1Total + level2Total + level3Total + level4Total;
                              
                              return (
                                <tr className="total-header-row combined-totals">
                                  <th className="total-label-cell" colSpan="1"> Grand Total</th>
                                  <th className="total-header-cell" colSpan="2">{level1Total}</th>
                                  <th className="total-header-cell" colSpan="2">{level2Total}</th>
                                  <th className="total-header-cell" colSpan="2">{level3Total}</th>
                                  <th className="total-header-cell" colSpan="2">{level4Total}</th>
                                  <th className="total-header-cell" colSpan="2">{grandTotal}</th>
                                </tr>
                              );
                            })()}
                            
                            {/* Total Separate CP/Cust Row for drill-down */}
                            {(() => {
                              const nonRootBranches = drillDownData.network.filter(branch => !branch.isRoot);
                              
                              // Level 1 - Count user types themselves
                              const level1CpTotal = nonRootBranches.filter(branch => branch.userType === 'CP' || branch.userType === 'Both').length;
                              const level1CustomerTotal = nonRootBranches.filter(branch => branch.userType === 'Customer' || branch.userType === 'Both').length;
                              
                              // Level 2-4 - Count referrals by type, ensure we get numbers only
                              const level2CpTotal = nonRootBranches.reduce((sum, branch) => {
                                const cpCount = (branch.level2 && typeof branch.level2 === 'object') ? (branch.level2.cp || 0) : 0;
                                return sum + (typeof cpCount === 'number' ? cpCount : 0);
                              }, 0);
                              
                              const level2CustomerTotal = nonRootBranches.reduce((sum, branch) => {
                                const customerCount = (branch.level2 && typeof branch.level2 === 'object') ? (branch.level2.customer || 0) : 0;
                                return sum + (typeof customerCount === 'number' ? customerCount : 0);
                              }, 0);
                              
                              const level3CpTotal = nonRootBranches.reduce((sum, branch) => {
                                const cpCount = (branch.level3 && typeof branch.level3 === 'object') ? (branch.level3.cp || 0) : 0;
                                return sum + (typeof cpCount === 'number' ? cpCount : 0);
                              }, 0);
                              
                              const level3CustomerTotal = nonRootBranches.reduce((sum, branch) => {
                                const customerCount = (branch.level3 && typeof branch.level3 === 'object') ? (branch.level3.customer || 0) : 0;
                                return sum + (typeof customerCount === 'number' ? customerCount : 0);
                              }, 0);
                              
                              const level4CpTotal = nonRootBranches.reduce((sum, branch) => {
                                const cpCount = (branch.level4 && typeof branch.level4 === 'object') ? (branch.level4.cp || 0) : 0;
                                return sum + (typeof cpCount === 'number' ? cpCount : 0);
                              }, 0);
                              
                              const level4CustomerTotal = nonRootBranches.reduce((sum, branch) => {
                                const customerCount = (branch.level4 && typeof branch.level4 === 'object') ? (branch.level4.customer || 0) : 0;
                                return sum + (typeof customerCount === 'number' ? customerCount : 0);
                              }, 0);
                              
                              const totalCp = level1CpTotal + level2CpTotal + level3CpTotal + level4CpTotal;
                              const totalCustomer = level1CustomerTotal + level2CustomerTotal + level3CustomerTotal + level4CustomerTotal;
                              
                              return (
                                <tr className="total-header-row separate-totals">
                                  
                                  <th className='total-label-cell'> Total</th>
                                  <th className="total-header-cell cp-total">{level1CpTotal}</th>
                                  <th className="total-header-cell customer-total">{level1CustomerTotal}</th>
                                  <th className="total-header-cell cp-total">{level2CpTotal}</th>
                                  <th className="total-header-cell customer-total">{level2CustomerTotal}</th>
                                  <th className="total-header-cell cp-total">{level3CpTotal}</th>
                                  <th className="total-header-cell customer-total">{level3CustomerTotal}</th>
                                  <th className="total-header-cell cp-total">{level4CpTotal}</th>
                                  <th className="total-header-cell customer-total">{level4CustomerTotal}</th>
                                  <th className="total-header-cell cp-total">{totalCp}</th>
                                  <th className="total-header-cell customer-total">{totalCustomer}</th>
                                </tr>
                              );
                            })()}
                            
                            {/* CP/Cust Labels Row */}
                            <tr className="total-header-row label-row">
                              <th className="user-label-cell" colSpan="1">User</th>
                              <th className="sub-level-header cp-label">CP</th>
                              <th className="sub-level-header customer-label">Cust</th>
                              <th className="sub-level-header cp-label">CP</th>
                              <th className="sub-level-header customer-label">Cust</th>
                              <th className="sub-level-header cp-label">CP</th>
                              <th className="sub-level-header customer-label">Cust</th>
                              <th className="sub-level-header cp-label">CP</th>
                              <th className="sub-level-header customer-label">Cust</th>
                              <th className="sub-level-header cp-label">CP</th>
                              <th className="sub-level-header customer-label">Cust</th>
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
                                  className={`hierarchy-row ${branchIndex % 2 === 0 ? 'even' : 'odd'} clickable-row`}
                                  onClick={() => handleDrillDownRowClick(branch)}
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
                                  {/* Level 1 - Show user's own type */}
                                  <td className="level-count-cell cp-cell">
                                    {branch.userType === 'CP' || branch.userType === 'Both' ? (
                                      <span className="own-type-count">1</span>
                                    ) : (
                                      <span className="zero-count">0</span>
                                    )}
                                  </td>
                                  <td className="level-count-cell customer-cell">
                                    {branch.userType === 'Customer' || branch.userType === 'Both' ? (
                                      <span className="own-type-count">1</span>
                                    ) : (
                                      <span className="zero-count">0</span>
                                    )}
                                  </td>
                                  {/* Level 2 */}
                                  <td className="level-count-cell cp-cell">
                                    {(branch.level2?.cp && branch.level2.cp > 0) ? (
                                      <span className="count-number">{branch.level2.cp}</span>
                                    ) : (branch.level2 && typeof branch.level2 === 'number' && branch.level2 > 0) ? (
                                      <span className="count-number">{branch.level2}</span>
                                    ) : (
                                      <span className="zero-count">0</span>
                                    )}
                                  </td>
                                  <td className="level-count-cell customer-cell">
                                    {(branch.level2?.customer && branch.level2.customer > 0) ? (
                                      <span className="count-number">{branch.level2.customer}</span>
                                    ) : (
                                      <span className="zero-count">0</span>
                                    )}
                                  </td>
                                  {/* Level 3 */}
                                  <td className="level-count-cell cp-cell">
                                    {(branch.level3?.cp && branch.level3.cp > 0) ? (
                                      <span className="count-number">{branch.level3.cp}</span>
                                    ) : (branch.level3 && typeof branch.level3 === 'number' && branch.level3 > 0) ? (
                                      <span className="count-number">{branch.level3}</span>
                                    ) : (
                                      <span className="zero-count">0</span>
                                    )}
                                  </td>
                                  <td className="level-count-cell customer-cell">
                                    {(branch.level3?.customer && branch.level3.customer > 0) ? (
                                      <span className="count-number">{branch.level3.customer}</span>
                                    ) : (
                                      <span className="zero-count">0</span>
                                    )}
                                  </td>
                                  {/* Level 4 */}
                                  <td className="level-count-cell cp-cell">
                                    {(branch.level4?.cp && branch.level4.cp > 0) ? (
                                      <span className="count-number">{branch.level4.cp}</span>
                                    ) : (branch.level4 && typeof branch.level4 === 'number' && branch.level4 > 0) ? (
                                      <span className="count-number">{branch.level4}</span>
                                    ) : (
                                      <span className="zero-count">0</span>
                                    )}
                                  </td>
                                  <td className="level-count-cell customer-cell">
                                    {(branch.level4?.customer && branch.level4.customer > 0) ? (
                                      <span className="count-number">{branch.level4.customer}</span>
                                    ) : (
                                      <span className="zero-count">0</span>
                                    )}
                                  </td>
                                  {/* Total */}
                                  <td className="total-cell cp-total">
                                    <span className="total-count">{branch.totalCp || 0}</span>
                                  </td>
                                  <td className="total-cell customer-total">
                                    <span className="total-count">{branch.totalCustomer || 0}</span>
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

export default Home;