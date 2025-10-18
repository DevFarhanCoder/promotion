import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const AllUsersManagement = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userNetwork, setUserNetwork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Edit states
  const [editingIntroducer, setEditingIntroducer] = useState(null);
  const [editingUserType, setEditingUserType] = useState(null);
  const [introducerInput, setIntroducerInput] = useState('');
  const [introducerSuggestions, setIntroducerSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Level modal states
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelUsers, setLevelUsers] = useState([]);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelLoading, setLevelLoading] = useState(false);

  // Fetch user network data
  const fetchUserNetwork = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        const response = await api.get(`/users/referral-network/${parsedUser.id}`);
        const branches = response.data.branches || [];
        const directReferrals = branches.filter(branch => !branch.isRoot);
        setUserNetwork(directReferrals);
      }
    } catch (err) {
      console.error('Error fetching user network:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch user network';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch users at a specific level for a branch
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

  // Search for introducers
  const searchIntroducers = useCallback(async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setIntroducerSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await api.get(`/users/search-introducers?q=${encodeURIComponent(searchTerm)}`);
      setIntroducerSuggestions(response.data.users || []);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Error searching introducers:', err);
      setIntroducerSuggestions([]);
    }
  }, []);

  // Update introducer
  const updateIntroducer = async (userId, introducerId) => {
    try {
      await api.put(`/users/update-introducer/${userId}`, { introducerId });
      await fetchUserNetwork(); // Refresh data
      setEditingIntroducer(null);
      setIntroducerInput('');
      setShowSuggestions(false);
      setSuccess('Introducer updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating introducer:', err);
      const errorMsg = err.response?.data?.message || 'Failed to update introducer';
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Update user type
  const updateUserType = async (userId, userType) => {
    try {
      await api.put(`/users/update-user-type/${userId}`, { userType });
      await fetchUserNetwork(); // Refresh data
      setEditingUserType(null);
      setSuccess(`User type updated to ${userType} successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating user type:', err);
      const errorMsg = err.response?.data?.message || 'Failed to update user type';
      setError(errorMsg);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      try {
        await api.delete(`/users/delete-user/${userId}`);
        await fetchUserNetwork(); // Refresh data
        setSuccess(`User ${userName} deleted successfully!`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Error deleting user:', err);
        const errorMsg = err.response?.data?.message || 'Failed to delete user';
        setError(errorMsg);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Calculate grand totals
  const calculateGrandTotals = () => {
    const totals = {
      level1CP: 0,
      level1Cust: 0,
      level2CP: 0,
      level2Cust: 0,
      level3CP: 0,
      level3Cust: 0,
      level4CP: 0,
      level4Cust: 0,
      totalCP: 0,
      totalCust: 0,
      grandTotal: 0
    };

    userNetwork.forEach(branch => {
      totals.level1CP += branch.level2?.cp || 0;
      totals.level1Cust += branch.level2?.customer || 0;
      totals.level2CP += branch.level3?.cp || 0;
      totals.level2Cust += branch.level3?.customer || 0;
      totals.level3CP += branch.level4?.cp || 0;
      totals.level3Cust += branch.level4?.customer || 0;
      totals.level4CP += branch.level5?.cp || 0;
      totals.level4Cust += branch.level5?.customer || 0;
      totals.totalCP += branch.totalCp || 0;
      totals.totalCust += branch.totalCustomer || 0;
    });

    totals.grandTotal = totals.totalCP + totals.totalCust;
    return totals;
  };

  useEffect(() => {
    fetchUserNetwork();
  }, [fetchUserNetwork]);

  // Handle introducer input change
  const handleIntroducerInputChange = (value) => {
    setIntroducerInput(value);
    searchIntroducers(value);
  };

  // Handle introducer selection
  const handleIntroducerSelect = (user, selectedIntroducer) => {
    updateIntroducer(user._id, selectedIntroducer._id);
  };

  // Handle user type selection
  const handleUserTypeSelect = (user, userType) => {
    updateUserType(user._id, userType);
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="all-users-management">
      {/* Navigation Header */}
      <nav className="management-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <img src="/promotion-hub.png" alt="Promotion Hub" className="navbar-logo" />
          </div>
          <div className="navbar-nav">
            <Link to="/home" className="nav-link">
              Home
            </Link>
            <Link to="/profile" className="nav-link">
              Profile
            </Link>
            <button onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate('/login');
            }} className="nav-button">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="management-content">
        <div className="section-header">
          <h2 className="section-title">All Users Management</h2>
          <p className="section-subtitle">Manage your complete network with detailed level breakdowns</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Scroll Hint for Mobile */}
        <div className="mobile-scroll-hint">
          ← Swipe left/right to see all columns →
        </div>

        {/* Network Table */}
        <div className="network-table-container">
          <table className="network-table">
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
                <th className="level-header-group" rowSpan="4">Introducer Name/Edit</th>
                <th className="level-header-group" rowSpan="4">I AM a</th>
                <th className="level-header-group" rowSpan="4">Delete</th>
              </tr>
              
              {/* Grand Total Row */}
              {(() => {
                const totals = calculateGrandTotals();
                return (
                  <tr className="total-header-row combined-totals">
                    <th className="grand-total-label-cell">Grand Total</th>
                    <th className="total-header-cell" colSpan="2">{totals.level1CP + totals.level1Cust}</th>
                    <th className="total-header-cell" colSpan="2">{totals.level2CP + totals.level2Cust}</th>
                    <th className="total-header-cell" colSpan="2">{totals.level3CP + totals.level3Cust}</th>
                    <th className="total-header-cell" colSpan="2">{totals.level4CP + totals.level4Cust}</th>
                    <th className="total-header-cell" colSpan="2">{totals.totalCP + totals.totalCust}</th>
                  </tr>
                );
              })()}
              
              {/* Total Separate CP/Cust Row */}
              {(() => {
                const totals = calculateGrandTotals();
                return (
                  <tr className="total-header-row separate-totals">
                    <th className="total-label-cell">Total</th>
                    <th className="total-header-cell cp-total">{totals.level1CP}</th>
                    <th className="total-header-cell customer-total">{totals.level1Cust}</th>
                    <th className="total-header-cell cp-total">{totals.level2CP}</th>
                    <th className="total-header-cell customer-total">{totals.level2Cust}</th>
                    <th className="total-header-cell cp-total">{totals.level3CP}</th>
                    <th className="total-header-cell customer-total">{totals.level3Cust}</th>
                    <th className="total-header-cell cp-total">{totals.level4CP}</th>
                    <th className="total-header-cell customer-total">{totals.level4Cust}</th>
                    <th className="total-header-cell cp-total">{totals.totalCP}</th>
                    <th className="total-header-cell customer-total">{totals.totalCust}</th>
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

              {/* User Rows */}
              {userNetwork.map((branch, index) => (
                <tr key={branch.id} className="user-row">
                  <td className="col-sno">{index + 1}</td>
                  <td className="col-user">{branch.displayName || branch.name}</td>
                  <td className="col-mobile">{branch.mobile}</td>
                  
                  {/* Level 1 (Level 2 in backend) */}
                  <td className="level-cell">
                    {branch.level2?.cp > 0 ? (
                      <span className="count-value">{branch.level2.cp}</span>
                    ) : (
                      <span className="zero-value">0</span>
                    )}
                  </td>
                  <td className="level-cell">
                    {branch.level2?.customer > 0 ? (
                      <span className="count-value">{branch.level2.customer}</span>
                    ) : (
                      <span className="zero-value">0</span>
                    )}
                  </td>

                  {/* Level 2 (Level 3 in backend) */}
                  <td className="level-cell">
                    {branch.level3?.cp > 0 ? (
                      <span className="count-value">{branch.level3.cp}</span>
                    ) : (
                      <span className="zero-value">0</span>
                    )}
                  </td>
                  <td className="level-cell">
                    {branch.level3?.customer > 0 ? (
                      <span className="count-value">{branch.level3.customer}</span>
                    ) : (
                      <span className="zero-value">0</span>
                    )}
                  </td>

                  {/* Level 3 (Level 4 in backend) */}
                  <td className="level-cell">
                    {branch.level4?.cp > 0 ? (
                      <span className="count-value">{branch.level4.cp}</span>
                    ) : (
                      <span className="zero-value">0</span>
                    )}
                  </td>
                  <td className="level-cell">
                    {branch.level4?.customer > 0 ? (
                      <span className="count-value">{branch.level4.customer}</span>
                    ) : (
                      <span className="zero-value">0</span>
                    )}
                  </td>

                  {/* Level 4 (Level 5 in backend) */}
                  <td className="level-cell">
                    {branch.level5?.cp > 0 ? (
                      <span className="count-value">{branch.level5.cp}</span>
                    ) : (
                      <span className="zero-value">0</span>
                    )}
                  </td>
                  <td className="level-cell">
                    {branch.level5?.customer > 0 ? (
                      <span className="count-value">{branch.level5.customer}</span>
                    ) : (
                      <span className="zero-value">0</span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="total-cell">{branch.totalCp || 0}</td>
                  <td className="total-cell">{branch.totalCustomer || 0}</td>

                  {/* Introducer Name/Edit */}
                  <td className="col-introducer">
                    {editingIntroducer === branch.id ? (
                      <div className="introducer-edit-container">
                        <input
                          type="text"
                          value={introducerInput}
                          onChange={(e) => handleIntroducerInputChange(e.target.value)}
                          placeholder="Type mobile or name..."
                          className="introducer-input"
                          autoFocus
                          onBlur={() => {
                            setTimeout(() => {
                              if (!showSuggestions) {
                                setEditingIntroducer(null);
                                setIntroducerInput('');
                              }
                            }, 200);
                          }}
                        />
                        {showSuggestions && introducerSuggestions.length > 0 && (
                          <div className="suggestions-dropdown">
                            {introducerSuggestions.map((suggester) => (
                              <div
                                key={suggester._id}
                                className="suggestion-item"
                                onClick={() => handleIntroducerSelect(branch, suggester)}
                              >
                                {suggester.displayName || suggester.name} - {suggester.mobile}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="introducer-display"
                        onClick={() => {
                          setEditingIntroducer(branch.id);
                          setIntroducerInput(user?.displayName || '');
                        }}
                      >
                        {user?.displayName || 'N/A'}
                        <span className="edit-icon">✎</span>
                      </div>
                    )}
                  </td>

                  {/* I AM a */}
                  <td className="col-type">
                    {editingUserType === branch.id ? (
                      <div className="user-type-options">
                        <label className="radio-option">
                          <input
                            type="radio"
                            name={`userType-${branch.id}`}
                            value="CP"
                            checked={branch.userType === 'CP'}
                            onChange={() => handleUserTypeSelect(branch, 'CP')}
                          />
                          CP
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name={`userType-${branch.id}`}
                            value="Customer"
                            checked={branch.userType === 'Customer'}
                            onChange={() => handleUserTypeSelect(branch, 'Customer')}
                          />
                          CUST
                        </label>
                        <label className="radio-option">
                          <input
                            type="radio"
                            name={`userType-${branch.id}`}
                            value="Both"
                            checked={branch.userType === 'Both'}
                            onChange={() => handleUserTypeSelect(branch, 'Both')}
                          />
                          BOTH
                        </label>
                        <button
                          className="cancel-btn"
                          onClick={() => setEditingUserType(null)}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div
                        className="user-type-display"
                        onClick={() => setEditingUserType(branch.id)}
                      >
                        {branch.userType || 'Customer'}
                        <span className="edit-icon">✎</span>
                      </div>
                    )}
                  </td>

                  {/* Delete */}
                  <td className="col-delete">
                    {((branch.totalCp || 0) + (branch.totalCustomer || 0)) === 0 ? (
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteUser(branch.id, branch.displayName || branch.name)}
                      >
                        Delete
                      </button>
                    ) : (
                      <span style={{ color: '#999', fontSize: '12px' }}>Has referrals</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* Level Users Modal */}
      {showLevelModal && (
        <div className="modal-overlay" onClick={() => setShowLevelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                Level {selectedLevel.level} - {selectedLevel.userType} Users
              </h3>
              <span className="subtitle">
                Under: {selectedLevel.branchUserName} ({selectedLevel.totalUsers} users)
              </span>
              <button className="close-btn" onClick={() => setShowLevelModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {levelLoading ? (
                <div className="loading">Loading...</div>
              ) : (
                <table className="level-users-table">
                  <thead>
                    <tr>
                      <th>Sr No</th>
                      <th>Name</th>
                      <th>Mobile</th>
                      <th>User Type</th>
                      <th>Join Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelUsers.map((levelUser, idx) => (
                      <tr key={levelUser._id}>
                        <td>{idx + 1}</td>
                        <td>{levelUser.displayName || levelUser.name}</td>
                        <td>{levelUser.mobile}</td>
                        <td>{levelUser.userType || 'Customer'}</td>
                        <td>
                          {new Date(levelUser.createdAt).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      </div> {/* Close management-content */}

      <style jsx>{`
        .management-navbar {
          background: #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          padding: 0;
          margin-bottom: 20px;
        }

        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
        }

        .navbar-logo {
          height: 40px;
          width: auto;
        }

        .navbar-nav {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-link {
          text-decoration: none;
          color: #666;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .nav-link:hover {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          transform: translateY(-2px);
        }

        .nav-button {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .nav-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }

        .management-content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 30px;
        }

        .all-users-management {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 1.3rem;
          font-weight: 600;
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 5px;
        }

        .section-subtitle {
          color: #666;
          font-size: 0.9rem;
        }

        .error-message {
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          text-align: center;
        }

        .mobile-scroll-hint {
          display: none; /* Hidden by default on desktop */
          text-align: center;
          padding: 8px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          margin: 0 10px 10px 10px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .network-table-container {
          background: white;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin: 0 10px;
        }

        .network-table {
          width: 100%;
          border-collapse: collapse;
        }

        .network-table thead tr:first-child th {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 10px 6px;
          font-weight: 600;
          font-size: 13px;
          border-right: 1px solid rgba(255,255,255,0.2);
          text-align: center;
        }

        .header-spacer {
          background: transparent;
          border: none;
        }

        .network-table thead tr.grand-total-row th {
          background: linear-gradient(135deg, rgba(210, 180, 140, 0.95), rgba(188, 143, 143, 0.95));
          color: #fff;
          padding: 8px 6px;
          font-weight: 700;
          font-size: 14px;
          border-right: 1px solid rgba(255,255,255,0.2);
          text-align: center;
        }

        .grand-total-label {
          text-align: left !important;
          padding-left: 8px !important;
          font-weight: 700;
        }

        .grand-total-value {
          font-weight: 700;
        }

        .network-table thead tr.separate-totals th {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 8px 6px;
          font-weight: 600;
          font-size: 13px;
          border-right: 1px solid rgba(255,255,255,0.2);
          text-align: center;
        }

        .total-label-cell {
          text-align: left !important;
          padding-left: 8px !important;
        }

        .total-value,
        .total-cp-value,
        .total-cust-value {
          font-weight: 600;
          text-align: center;
        }

        .network-table thead tr.label-row th {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          padding: 8px 4px;
          font-weight: 500;
          font-size: 12px;
          border-right: 1px solid rgba(255,255,255,0.2);
          text-align: center;
        }

        .mobile-no-label-cell {
          text-align: center !important;
        }

        .cp-label, .cust-label {
          font-weight: 500;
        }

        .network-table th:last-child {
          border-right: none !important;
        }

        .level-header {
          text-align: center;
          border-right: 2px solid rgba(255,255,255,0.3) !important;
        }

        .sub-header {
          text-align: center;
        }

        .network-table td {
          padding: 10px 6px;
          border-bottom: 1px solid #e9ecef;
          font-size: 14px;
          text-align: center;
        }

        .col-sno {
          width: 40px;
          text-align: center !important;
        }

        .col-user {
          min-width: 100px;
          text-align: left !important;
          font-weight: 500;
          font-size: 14px;
        }

        .col-mobile {
          min-width: 95px;
          font-size: 14px;
        }

        .col-introducer {
          min-width: 110px;
          font-size: 14px;
        }

        .col-type {
          min-width: 65px;
          font-size: 14px;
        }

        .col-delete {
          min-width: 65px;
        }

        .grand-total-row {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
          font-weight: 700;
        }

        .total-label {
          text-align: left !important;
          padding-left: 15px !important;
          font-weight: 700;
          color: #667eea;
        }

        .total-value {
          font-weight: 700;
          color: #667eea;
        }

        .user-row:hover {
          background: #f8f9fa;
        }

        .level-cell {
          transition: all 0.2s;
        }

        .count-value {
          color: #667eea;
          font-weight: 600;
          font-size: 14px;
        }

        .zero-value {
          color: #ccc;
          font-size: 13px;
        }

        .total-cell {
          font-weight: 600;
          color: #667eea;
          background: rgba(102, 126, 234, 0.05);
          font-size: 14px;
        }

        .introducer-edit-container {
          position: relative;
        }

        .introducer-input {
          width: 100%;
          padding: 6px 8px;
          border: 2px solid #667eea;
          border-radius: 4px;
          font-size: 13px;
          outline: none;
        }

        .suggestions-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          max-height: 180px;
          overflow-y: auto;
          margin-top: 2px;
        }

        .suggestion-item {
          padding: 10px 12px;
          cursor: pointer;
          font-size: 13px;
          border-bottom: 1px solid #f0f0f0;
        }

        .suggestion-item:last-child {
          border-bottom: none;
        }

        .suggestion-item:hover {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .introducer-display,
        .user-type-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .introducer-display:hover,
        .user-type-display:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          color: #667eea;
        }

        .edit-icon {
          color: #667eea;
          opacity: 0.7;
          font-size: 13px;
          margin-left: 6px;
        }

        .introducer-display:hover .edit-icon,
        .user-type-display:hover .edit-icon {
          opacity: 1;
        }

        .user-type-options {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 8px;
          background: white;
          border: 1px solid #667eea;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          font-size: 14px;
          padding: 5px;
        }

        .radio-option:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
          border-radius: 3px;
        }

        .radio-option input[type="radio"] {
          margin: 0;
          accent-color: #667eea;
        }

        .cancel-btn {
          align-self: flex-end;
          background: #f8f9fa;
          border: 1px solid #667eea;
          border-radius: 3px;
          padding: 4px 10px;
          cursor: pointer;
          font-size: 13px;
          color: #667eea;
        }

        .cancel-btn:hover {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .delete-btn {
          background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }

        .delete-btn:hover {
          background: linear-gradient(135deg, #ee5a6f, #c92a2a);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(238, 90, 111, 0.4);
        }

        .loading {
          text-align: center;
          padding: 40px;
          font-size: 1.1rem;
          color: #666;
        }

        /* Responsive Styles */
        @media (max-width: 768px) {
          .navbar-container {
            padding: 0.75rem 1rem;
          }

          .navbar-nav {
            gap: 0.5rem;
          }

          .nav-link {
            padding: 6px 12px;
            font-size: 14px;
          }

          .nav-button {
            padding: 6px 12px;
            font-size: 14px;
          }

          .management-content {
            padding: 0 10px;
          }

          .section-title {
            font-size: 1.1rem;
          }

          .section-subtitle {
            font-size: 0.8rem;
          }

          /* Make table scrollable horizontally */
          .network-table-container {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            margin: 0 5px;
          }

          .network-table {
            min-width: 900px; /* Ensure table doesn't shrink */
          }

          /* Compact table headers */
          .network-table thead tr:first-child th {
            padding: 6px 2px;
            font-size: 9px;
          }

          .network-table thead tr.grand-total-row th {
            padding: 5px 2px;
            font-size: 10px;
          }

          .network-table thead tr.separate-totals th {
            padding: 5px 2px;
            font-size: 9px;
          }

          .network-table thead tr.label-row th {
            padding: 4px 1px;
            font-size: 8px;
          }

          /* Compact table body */
          .network-table td {
            padding: 6px 2px;
            font-size: 10px;
          }

          .col-sno {
            width: 30px;
          }

          .col-user {
            min-width: 70px;
            font-size: 10px;
          }

          .col-mobile {
            min-width: 70px;
            font-size: 10px;
          }

          .col-introducer {
            min-width: 80px;
            font-size: 10px;
          }

          .col-type {
            min-width: 50px;
            font-size: 10px;
          }

          .col-delete {
            min-width: 50px;
          }

          .count-value {
            font-size: 10px;
          }

          .zero-value {
            font-size: 9px;
          }

          .total-cell {
            font-size: 10px;
          }

          .delete-btn {
            font-size: 9px;
            padding: 4px 6px;
          }

          .edit-icon {
            font-size: 9px;
          }

          .introducer-input {
            font-size: 10px;
            padding: 4px 5px;
          }

          .suggestion-item {
            padding: 6px 8px;
            font-size: 10px;
          }

          .radio-option {
            font-size: 13px;
          }
        }

        @media (max-width: 480px) {
          .management-content {
            padding: 0 5px;
          }

          .navbar-container {
            flex-direction: column;
            gap: 10px;
            padding: 0.5rem;
          }

          .navbar-nav {
            width: 100%;
            justify-content: space-between;
          }

          .section-title {
            font-size: 1rem;
            text-align: center;
          }

          .section-subtitle {
            font-size: 0.75rem;
            text-align: center;
          }

          /* Show scroll hint only on very small screens */
          .mobile-scroll-hint {
            display: block;
          }

          .network-table-container {
            margin: 0;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          .network-table {
            min-width: 850px; /* Ensure minimum width for all columns */
          }

          /* Extra compact for very small screens */
          .network-table thead tr:first-child th {
            padding: 5px 1px;
            font-size: 8px;
          }

          .network-table thead tr.grand-total-row th {
            padding: 4px 1px;
            font-size: 9px;
          }

          .network-table thead tr.separate-totals th {
            padding: 4px 1px;
            font-size: 8px;
          }

          .network-table thead tr.label-row th {
            padding: 3px 1px;
            font-size: 7px;
          }

          .network-table td {
            padding: 5px 1px;
            font-size: 9px;
          }

          .col-sno {
            width: 25px;
          }

          .col-user {
            min-width: 60px;
            font-size: 9px;
          }

          .col-mobile {
            min-width: 65px;
            font-size: 9px;
          }

          .col-introducer {
            min-width: 70px;
            font-size: 9px;
          }

          .col-type {
            min-width: 45px;
            font-size: 9px;
          }

          .col-delete {
            min-width: 45px;
          }

          .delete-btn {
            font-size: 8px;
            padding: 3px 5px;
          }

          .count-value {
            font-size: 9px;
          }

          .zero-value {
            font-size: 8px;
          }

          .total-cell {
            font-size: 9px;
          }

          .edit-icon {
            font-size: 8px;
          }

          .introducer-input {
            font-size: 9px;
            padding: 3px 4px;
          }

          .suggestion-item {
            padding: 5px 6px;
            font-size: 9px;
          }

          .radio-option {
            font-size: 11px;
            padding: 2px;
          }

          .cancel-btn {
            font-size: 9px;
            padding: 2px 5px;
          }

          .users-management-table {
            font-size: 10px;
          }

          .users-management-table th,
          .users-management-table td {
            padding: 6px 3px;
            font-size: 10px;
            max-width: 100px;
          }

          .users-management-table th {
            font-size: 9px;
          }

          .users-management-table th:first-child,
          .users-management-table td:first-child {
            max-width: 30px;
          }

          .edit-icon {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default AllUsersManagement;
