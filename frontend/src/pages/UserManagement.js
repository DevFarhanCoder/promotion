import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const UserManagement = () => {
  const navigate = useNavigate();
  const [hierarchicalData, setHierarchicalData] = useState([]);
  const [grandTotals, setGrandTotals] = useState(null);
  const [totalRootUsers, setTotalRootUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelUsers, setLevelUsers] = useState([]);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [levelLoading, setLevelLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableRootUsers, setAvailableRootUsers] = useState([]);
  
  // Hardcoded Rajesh Modi user ID (will be fetched from API)
  const RAJESH_MODI_MOBILE = '9867477227';

  useEffect(() => {
    // Check admin authentication
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }

    fetchHierarchicalNetwork();
  }, [navigate]);

  const fetchHierarchicalNetwork = async () => {
    try {
      setLoading(true);
      // Always fetch all root users to find Rajesh Modi's ID
      const response = await api.get('/admin/referral-network');
      const allData = response.data.data || [];
      
      // Find Rajesh Modi from the data
      const rajeshModiData = allData.find(user => 
        user.mobile === RAJESH_MODI_MOBILE || 
        user.name?.toLowerCase().includes('rajesh modi')
      );
      
      if (rajeshModiData) {
        // Set only Rajesh Modi's data
        setHierarchicalData([rajeshModiData]);
        setTotalRootUsers(1);
        setAvailableRootUsers([{
          id: rajeshModiData.id,
          name: rajeshModiData.name,
          displayName: rajeshModiData.displayName,
          mobile: rajeshModiData.mobile
        }]);
      } else {
        // Fallback if Rajesh Modi not found - show all data
        setHierarchicalData(allData);
        setTotalRootUsers(response.data.totalRootUsers || 0);
        const rootUsers = allData.map(entry => ({
          id: entry.id,
          name: entry.name,
          displayName: entry.displayName,
          mobile: entry.mobile
        }));
        setAvailableRootUsers(rootUsers);
      }
      
      setGrandTotals(response.data.grandTotals || {});
      
    } catch (err) {
      console.error('Fetch hierarchical network error:', err);
      setError(err.response?.data?.message || 'Failed to fetch hierarchical network');
      setHierarchicalData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLevelUsers = async (branchUserId, level, branchUserName) => {
    setLevelLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/admin/level-users/${branchUserId}/${level}`);
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

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      const response = await api.delete(`/admin/users/${userId}`);
      setSuccess(`User "${userName}" deleted successfully. ${response.data.reassignedReferralsCount} referrals were reassigned.`);
      
      // Refresh hierarchical data
      fetchHierarchicalNetwork();
      
      // Close level modal if it was open
      if (showLevelModal && selectedLevel?.rootUserId === userId) {
        setShowLevelModal(false);
      }
    } catch (err) {
      console.error('Delete user error:', err);
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  // Filter hierarchical data based on search term only (root user filtering is handled by backend)
  const filteredHierarchicalData = useMemo(() => {
    if (!hierarchicalData) return [];
    
    // Apply search term filter
    if (searchTerm) {
      return hierarchicalData.map(rootEntry => {
        const matchesSearch = rootEntry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rootEntry.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rootEntry.mobile?.includes(searchTerm);
        
        let filteredBranches = rootEntry.branches;
        if (!matchesSearch) {
          filteredBranches = rootEntry.branches.filter(branch =>
            branch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            branch.mobile?.includes(searchTerm)
          );
        }
        
        return {
          ...rootEntry,
          branches: filteredBranches
        };
      }).filter(entry => entry.branches.length > 0);
    }
    
    return hierarchicalData;
  }, [hierarchicalData, searchTerm]);



  if (loading) {
    return <div className="loading">Loading user management...</div>;
  }

  return (
    <div className="modern-app">
      {/* Modern Admin Navigation */}
      <nav className="modern-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            User Management
          </div>
          <div className="navbar-nav">
            <button onClick={() => navigate('/admin/dashboard')} className="nav-button">
              Dashboard
            </button>
            <button onClick={handleLogout} className="nav-button">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="user-management">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {/* Search and Controls */}
        <div className="controls-section">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search users by name, mobile, or introducer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* 6-Level Hierarchical Table - Branch Based */}
        <div className="hierarchy-section">
          <h2>All Users</h2>
          {filteredHierarchicalData.length === 0 ? (
            <p>No root users found.</p>
          ) : (
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
                  {filteredHierarchicalData.map((rootEntry) => (
                    rootEntry.branches.map((branch, branchIndex) => (
                      <tr key={`${rootEntry.id}-${branchIndex}`} className={`hierarchy-row ${branchIndex % 2 === 0 ? 'even' : 'odd'} ${branch.isRoot ? 'root-branch' : 'user-branch'}`}>
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
                              title={`View ${branch.level2} users at Level 2 under ${branch.name}`}
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
                              title={`View ${branch.level3} users at Level 3 under ${branch.name}`}
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
                              title={`View ${branch.level4} users at Level 4 under ${branch.name}`}
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
                              title={`View ${branch.level5} users at Level 5 under ${branch.name}`}
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
                              title={`View ${branch.level6} users at Level 6 under ${branch.name}`}
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
                    ))
                  ))}
                
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Level Users Modal */}
        {showLevelModal && (
          <div className="modal-overlay" onClick={() => setShowLevelModal(false)}>
            <div className="level-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {selectedLevel?.level}️⃣ Level {selectedLevel?.level} Users under {selectedLevel?.branchUserName}
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
                ) : selectedLevel && levelUsers ? (
                  <div className="level-users-content">
                    <div className="level-info">
                      <div className="level-header-info">
                        <h4>� Level {selectedLevel.level} Statistics</h4>
                        <div className="level-stats">
                          <div className="stat-item">
                            <span className="stat-label">Branch User:</span>
                            <span className="stat-value">{selectedLevel.branchUser?.name} (@{selectedLevel.branchUser?.displayName})</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Total Users at Level {selectedLevel.level}:</span>
                            <span className="stat-value">{selectedLevel.totalUsers}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="users-list">
                      <h4>� Users List</h4>
                      {levelUsers.length === 0 ? (
                        <p>No users found at this level.</p>
                      ) : (
                        <div className="level-users-table-container">
                          <table className="level-users-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Display Name</th>
                                <th>Mobile</th>
                                <th>Introducer</th>
                                <th>Join Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {levelUsers.map((user) => (
                                <tr key={user._id}>
                                  <td className="user-name-cell">{user.name}</td>
                                  <td className="user-display-cell">@{user.displayName}</td>
                                  <td className="user-mobile-cell">{user.mobile}</td>
                                  <td className="user-introducer-cell">
                                    <div className="introducer-info">
                                      <div className="introducer-name">{user.introducerName}</div>
                                      <div className="introducer-mobile">{user.introducerMobile}</div>
                                    </div>
                                  </td>
                                  <td className="user-date-cell">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p>No level data available.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .user-management {
          padding: 20px;
          max-width: 1600px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        /* Hierarchy Statistics Grid */
        .hierarchy-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }

        .stat-card {
          background: white;
          border: 2px solid #e0e0e0;
          padding: 20px 15px;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        /* Hierarchy Table */
        .hierarchy-section {
          background: white;
          padding: 25px;
          margin-bottom: 30px;
        }

        .hierarchy-section h2 {
          margin: 0 0 20px 0;
          font-size: 1.3rem;
          font-weight: 600;
          color: #4a5568;
        }

        .hierarchy-table-container {
          overflow-x: auto;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          -webkit-overflow-scrolling: touch;
        }

        .hierarchy-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          background: white;
          font-size: 0.95rem;
          min-width: 900px;
        }

        .hierarchy-table th {
          background: #4a5568;
          color: #ffffff;
          padding: 16px 20px;
          text-align: left;
          font-weight: 700;
          font-size: 1.05rem;
          text-transform: none;
          letter-spacing: 0.025em;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .hierarchy-table th:last-child {
          border-right: none;
        }

        .hierarchy-table th.level-header {
          text-align: center;
          min-width: 120px;
        }

        .hierarchy-table th:first-child {
          text-align: left;
          min-width: 280px;
          padding-left: 24px;
        }

        .hierarchy-table th.total-header {
          text-align: center;
          min-width: 100px;
        }

        .hierarchy-table td {
          padding: 16px 20px;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: middle;
          font-size: 0.95rem;
        }

        .hierarchy-table td:last-child {
          border-right: none;
        }

        .hierarchy-row {
          background: white;
          transition: all 0.15s ease;
        }

        .hierarchy-row.even {
          background: #f7fafc;
        }

        .hierarchy-row:hover {
          background: #edf2f7;
        }

        .hierarchy-row.root-branch {
          background: #fffbeb;
        }

        .hierarchy-row.root-branch:hover {
          background: #fef3c7;
        }

        .level-1-cell {
          text-align: left !important;
          padding: 16px 24px !important;
        }

        .branch-user-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .branch-user-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #2d3748;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .root-indicator {
          font-size: 1rem;
        }

        .branch-user-meta {
          display: flex;
          gap: 12px;
          font-size: 0.875rem;
          color: #718096;
        }

        .branch-display {
          font-weight: 500;
          color: #4a5568;
        }

        .branch-mobile {
          font-family: 'Courier New', monospace;
          color: #718096;
          font-weight: 400;
        }

        .level-count-cell {
          padding: 16px 20px !important;
        }

        .count-button {
          display: inline-block;
          padding: 8px 20px;
          border: none;
          background: #48bb78;
          color: white;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 90px;
          border-radius: 5px;
        }

        .count-button:hover {
          background: #38a169;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(72, 187, 120, 0.3);
        }

        .count-button:active {
          transform: translateY(0);
        }

        .count-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .zero-count {
          color: #cbd5e0;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .total-cell {
          background: white !important;
          font-weight: 700;
        }

        .total-count {
          color: #2d3748;
          font-weight: 700;
          font-size: 1.125rem;
        }

        /* Level Modal */
        .level-modal-content {
          background: white;
          border-radius: 15px;
          width: 95%;
          max-width: 1200px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .chain-visualization {
          padding: 20px;
          overflow-y: auto;
        }

        .chain-stats {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
          margin-bottom: 25px;
        }

        .root-user h4 {
          color: #667eea;
          margin-bottom: 10px;
        }

        .user-card.root {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 15px;
          border-radius: 10px;
          text-align: center;
        }

        .user-card.root .user-name {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 5px;
        }

        .user-card.root .user-display {
          opacity: 0.9;
          margin-bottom: 5px;
        }

        .user-card.root .user-mobile {
          opacity: 0.8;
          font-size: 0.9rem;
        }

        .level-summary h4 {
          color: #667eea;
          margin-bottom: 15px;
        }

        .levels-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }

        .level-stat {
          text-align: center;
          padding: 10px;
          border-radius: 8px;
          color: white;
        }

        .level-stat.level-1 {
          background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
          color: #333;
        }

        .level-stat.level-2 {
          background: linear-gradient(135deg, #c0c0c0 0%, #e8e8e8 100%);
          color: #333;
        }

        .level-stat.level-3 {
          background: linear-gradient(135deg, #cd7f32 0%, #daa520 100%);
        }

        .level-stat.level-4 {
          background: linear-gradient(135deg, #8e44ad 0%, #3498db 100%);
        }

        .level-stat.level-5 {
          background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
        }

        .level-number {
          font-size: 0.8rem;
          font-weight: 600;
        }

        .level-count {
          font-size: 1.5rem;
          font-weight: 800;
        }

        .total-referrals {
          text-align: center;
          padding: 10px;
          background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
          color: white;
          border-radius: 8px;
          font-size: 1.1rem;
        }

        .chain-tree h4 {
          color: #667eea;
          margin-bottom: 15px;
        }

        .tree-container {
          background: #f8f9fa;
          border-radius: 10px;
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }

        .tree-level {
          margin-left: 20px;
          border-left: 2px solid #ddd;
          padding-left: 15px;
        }

        .tree-level.level-1 {
          margin-left: 0;
          border-left: none;
          padding-left: 0;
        }

        .tree-node {
          margin-bottom: 15px;
          position: relative;
        }

        .node-card {
          background: white;
          border-radius: 8px;
          padding: 12px;
          border-left: 4px solid #ddd;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .node-card.level-1 {
          border-left-color: #ffd700;
          background: rgba(255, 215, 0, 0.05);
        }

        .node-card.level-2 {
          border-left-color: #c0c0c0;
          background: rgba(192, 192, 192, 0.05);
        }

        .node-card.level-3 {
          border-left-color: #cd7f32;
          background: rgba(205, 127, 50, 0.05);
        }

        .node-card.level-4 {
          border-left-color: #8e44ad;
          background: rgba(142, 68, 173, 0.05);
        }

        .node-card.level-5 {
          border-left-color: #e74c3c;
          background: rgba(231, 76, 60, 0.05);
        }

        .node-info {
          flex: 1;
        }

        .node-name {
          font-weight: 700;
          color: #333;
          margin-bottom: 2px;
        }

        .node-display {
          color: #667eea;
          font-size: 0.9rem;
          margin-bottom: 2px;
        }

        .node-mobile {
          color: #666;
          font-size: 0.8rem;
          font-family: monospace;
        }

        .node-meta {
          display: flex;
          gap: 10px;
          margin-top: 5px;
        }

        .level-badge {
          background: #667eea;
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .join-date {
          color: #888;
          font-size: 0.7rem;
        }

        .children-count {
          background: #2ecc71;
          color: white;
          padding: 4px 8px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .level-users-content {
          padding: 20px;
          overflow-y: auto;
        }

        .level-info {
          margin-bottom: 25px;
        }

        .level-header-info h4 {
          color: #667eea;
          margin-bottom: 15px;
        }

        .level-stats {
          display: grid;
          gap: 10px;
          margin-bottom: 15px;
        }

        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .stat-label {
          font-weight: 600;
          color: #333;
        }

        .stat-value {
          color: #667eea;
          font-weight: 700;
        }

        .users-list h4 {
          color: #667eea;
          margin-bottom: 15px;
        }

        .level-users-table-container {
          overflow-x: auto;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
        }

        .level-users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.9rem;
        }

        .level-users-table th {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }

        .level-users-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }

        .level-users-table tbody tr:hover {
          background: #f8f9fa;
        }

        .user-name-cell {
          font-weight: 700;
          color: #333;
        }

        .user-display-cell {
          color: #667eea;
          font-weight: 600;
        }

        .user-mobile-cell {
          font-family: monospace;
          background: #f0f0f0;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }

        .user-introducer-cell {
          font-size: 0.85rem;
        }

        .introducer-info .introducer-name {
          font-weight: 600;
          color: #333;
          margin-bottom: 2px;
        }

        .introducer-info .introducer-mobile {
          color: #666;
          font-family: monospace;
          font-size: 0.8rem;
        }

        .user-date-cell {
          color: #666;
          font-size: 0.85rem;
        }

        /* Branch-based table styles */
        .root-branch {
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border-left: 4px solid #f39c12;
        }

        .user-branch {
          background: #fff;
        }

        .branch-user-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .branch-user-name {
          font-weight: 700;
          color: #333;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .root-indicator {
          color: #f39c12;
          font-size: 1.1em;
        }

        .branch-user-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .branch-display {
          color: #667eea;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .branch-mobile {
          color: #666;
          font-family: monospace;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.8rem;
          display: inline-block;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .network-stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .network-table {
            font-size: 0.8rem;
          }
          
          .network-table th,
          .network-table td {
            padding: 8px 6px;
          }
        }

        @media (max-width: 768px) {
          .user-management {
            padding: 15px;
          }
          
          .network-stats-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }
          
          .network-section {
            padding: 15px;
          }
          
          .network-table-container {
            font-size: 0.75rem;
          }
          
          .user-cell {
            padding: 10px !important;
          }
          
          .user-info .user-name {
            font-size: 0.9rem;
          }
          
          .action-buttons {
            flex-direction: column;
            gap: 4px;
          }
          
          .view-chain-btn,
          .delete-user-btn {
            font-size: 0.7rem;
            padding: 4px 6px;
          }
          
          .chain-stats {
            grid-template-columns: 1fr;
            gap: 15px;
          }
          
          .levels-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .chain-modal-content {
            width: 98%;
            max-height: 95vh;
          }
        }

        @media (max-width: 480px) {
          .network-stats-grid {
            grid-template-columns: 1fr;
          }
          
          .levels-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .tree-level {
            margin-left: 10px;
            padding-left: 10px;
          }
          
          .node-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .children-count {
            align-self: flex-end;
          }
        }

        .stats-section {
          margin-bottom: 30px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .stat-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #3b82f6;
          color: white;
          margin: 0 auto 10px;
          border: 3px solid #e0e0e0;
        }

        .stat-number {
          font-size: 2.2rem;
          font-weight: 800;
          color: #111827;
          margin: 8px 0;
        }

        .stat-label {
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .controls-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
          gap: 20px;
          flex-wrap: wrap;
        }

        .user-info-header {
          background: #1f2937;
          padding: 20px 25px;
          color: white;
          border-left: 5px solid #3b82f6;
          flex: 1;
        }

        .user-info-header h3 {
          color: white;
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0 0 8px 0;
        }

        .user-info-header .info-text {
          color: #d1d5db;
          font-size: 0.95rem;
          margin: 0;
          font-weight: 400;
        }

        .search-container {
          flex: 0 0 350px;
        }

        .controls-section {
          margin-bottom: 20px;
        }

        .search-container {
          max-width: 100%;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.95rem;
          background: white;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #48bb78;
          box-shadow: 0 0 0 3px rgba(72, 187, 120, 0.1);
        }

        .search-input::placeholder {
          color: #a0aec0;
        }

        .total-count {
          color: #666;
          font-weight: 500;
        }

        .users-section {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }

        .users-table-container {
          overflow-x: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .users-table th,
        .users-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .users-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #333;
        }

        .user-info .user-name {
          font-weight: 600;
          color: #333;
        }

        .user-info .user-display {
          color: #666;
          font-size: 0.9rem;
        }

        .contact-info .mobile {
          font-family: monospace;
          background: #f0f0f0;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .introducer-info .introducer-name {
          font-weight: 500;
          color: #333;
        }

        .introducer-info .introducer-mobile {
          color: #666;
          font-size: 0.9rem;
          font-family: monospace;
        }

        .referral-count {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .count-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .view-referrals-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
        }

        .view-referrals-btn:hover {
          background: #218838;
        }

        .join-date {
          color: #666;
          font-size: 0.9rem;
        }

        .delete-user-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .delete-user-btn:hover {
          background: #c82333;
        }

        .top-introducers-section {
          background: white;
          border-radius: 10px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .introducers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 15px;
          margin-top: 15px;
        }

        .introducer-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 8px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .introducer-card .rank {
          font-size: 1.5rem;
          font-weight: bold;
          opacity: 0.8;
        }

        .introducer-card .name {
          font-weight: 600;
        }

        .introducer-card .display-name,
        .introducer-card .mobile {
          font-size: 0.9rem;
          opacity: 0.9;
        }

        .introducer-card .referral-count {
          margin-left: auto;
          text-align: center;
        }

        .introducer-card .count {
          display: block;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .introducer-card .label {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 10px;
          width: 90%;
          max-width: 800px;
          max-height: 80vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
        }

        .modal-body {
          padding: 20px;
          overflow-y: auto;
        }

        .referrals-summary {
          margin-bottom: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 6px;
        }

        .referrals-table {
          width: 100%;
          border-collapse: collapse;
        }

        .referrals-table th,
        .referrals-table td {
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .referrals-table th {
          background: #f8f9fa;
          font-weight: 600;
        }

        .sub-referral-count {
          background: #17a2b8;
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 0.8rem;
        }

        .no-data-message {
          text-align: center;
          padding: 30px;
          color: #666;
          font-style: italic;
        }

        @media (max-width: 1024px) {
          .hierarchy-table {
            min-width: 800px;
          }

          .hierarchy-table th {
            font-size: 0.85rem;
            padding: 12px 16px;
          }

          .hierarchy-table td {
            font-size: 0.875rem;
            padding: 14px 16px;
          }

          .count-button {
            padding: 7px 16px;
            font-size: 0.8125rem;
            min-width: 80px;
          }
        }

        @media (max-width: 768px) {
          .user-management {
            padding: 15px;
          }

          .hierarchy-section {
            padding: 15px;
          }

          .hierarchy-section h2 {
            font-size: 1.1rem;
            margin-bottom: 15px;
          }

          .hierarchy-table {
            min-width: 750px;
          }

          .hierarchy-table th {
            font-size: 0.8rem;
            padding: 12px 12px;
          }

          .hierarchy-table td {
            font-size: 0.8125rem;
            padding: 12px 12px;
          }

          .hierarchy-table th:first-child {
            min-width: 220px;
            padding-left: 16px;
          }

          .branch-user-name {
            font-size: 0.875rem;
          }

          .branch-user-meta {
            font-size: 0.8rem;
            gap: 10px;
          }

          .count-button {
            padding: 6px 14px;
            font-size: 0.75rem;
            min-width: 70px;
          }

          .search-input {
            font-size: 0.95rem;
          }
        }

        @media (max-width: 480px) {
          .user-management {
            padding: 10px;
          }

          .hierarchy-section {
            padding: 10px;
          }

          .hierarchy-table {
            min-width: 700px;
          }

          .hierarchy-table th {
            font-size: 0.75rem;
            padding: 10px 8px;
          }

          .hierarchy-table td {
            font-size: 0.75rem;
            padding: 10px 8px;
          }

          .hierarchy-table th:first-child {
            min-width: 200px;
            padding-left: 12px;
          }

          .branch-user-name {
            font-size: 0.8125rem;
          }

          .branch-user-meta {
            font-size: 0.75rem;
            gap: 8px;
            flex-direction: column;
          }

          .count-button {
            padding: 5px 12px;
            font-size: 0.7rem;
            min-width: 65px;
          }

          .search-input {
            font-size: 0.875rem;
            padding: 10px 14px;
          }
        }

          .root-user-info {
            flex-direction: column;
            text-align: center;
          }

          .level-count-button {
            font-size: 0.7rem;
            padding: 4px 8px;
            min-width: 40px;
            height: 32px;
          }

          .direct-referrals {
            font-size: 0.8rem;
          }

          .level-modal .modal-content {
            width: 95%;
            height: 85vh;
            margin: 2.5vh auto;
            padding: 15px;
          }

          .level-users-table {
            font-size: 0.8rem;
          }

          .level-users-table th,
          .level-users-table td {
            padding: 8px;
          }

          .user-mobile-cell {
            font-size: 0.7rem;
            padding: 2px 4px;
          }

          .stat-item {
            flex-direction: column;
            text-align: center;
            gap: 5px;
          }
        }

        @media (max-width: 480px) {
          .hierarchy-table th,
          .hierarchy-table td {
            min-width: 100px;
            font-size: 0.75rem;
            padding: 6px;
          }

          .root-user-info h4 {
            font-size: 1rem;
          }

          .level-count-button {
            font-size: 0.65rem;
            padding: 3px 6px;
            min-width: 35px;
            height: 28px;
          }

          .level-modal .modal-content {
            height: 90vh;
            margin: 5vh auto;
            padding: 10px;
          }

          .level-users-table {
            font-size: 0.75rem;
          }

          .level-users-table th,
          .level-users-table td {
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default UserManagement;