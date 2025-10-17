import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    displayName: '',
    password: '',
    introducerId: '',
    introducerMobile: '',
    introducerName: '',
    userType: '' // Added userType field
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserTypeModal, setShowUserTypeModal] = useState(false); // Modal for user type selection
  const [showPassword, setShowPassword] = useState(false); // Password visibility toggle

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Search for introducer by mobile number
  const handleSearchIntroducer = async (query) => {
    setSearchQuery(query);
    
    if (query.length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await api.get(`/users/search?mobile=${query}`);
      setSearchResults(response.data.users || []);
      setShowDropdown(true);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Select an introducer from search results
  const selectIntroducer = (user) => {
    setFormData(prev => ({
      ...prev,
      introducerId: user._id,
      introducerMobile: user.mobile,
      introducerName: user.displayName || user.name
    }));
    setSearchQuery(`${user.displayName || user.name} (${user.mobile})`);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate mobile number
      if (!/^[0-9]{10}$/.test(formData.mobile)) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      // Validate password
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Validate introducer
      if (!formData.introducerId) {
        throw new Error('Please select an introducer from existing members');
      }

      // Show user type selection modal instead of directly submitting
      setLoading(false);
      setShowUserTypeModal(true);

    } catch (err) {
      setError(err.message || 'Failed to validate form');
      setLoading(false);
    }
  };

  // Handle user type selection and submit
  const handleUserTypeSelection = async (userType) => {
    setFormData(prev => ({ ...prev, userType }));
    setShowUserTypeModal(false);
    setLoading(true);
    setError('');

    try {
      // Create request data
      const submitData = {
        name: formData.displayName, // Use displayName as the main name
        mobile: formData.mobile,
        displayName: formData.displayName,
        password: formData.password,
        introducerId: formData.introducerId,
        introducerMobile: formData.introducerMobile,
        introducerName: formData.introducerName,
        userType: userType
      };

      const response = await api.post('/auth/signup', submitData);

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setSuccess('Registration successful! Redirecting to home...');
        setTimeout(() => {
          navigate('/home');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Sign Up</h2>
      <form onSubmit={handleSubmit}>


        <div className="form-group">
          <label className="form-label">Mobile Number *</label>
          <input
            type="tel"
            name="mobile"
            value={formData.mobile}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter 10-digit mobile number"
            maxLength="10"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Name to Appear on Design *</label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Name for promotional image"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password *</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-input"
              placeholder="Enter password (min 6 characters)"
              minLength="6"
              style={{ paddingRight: '45px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                color: '#666',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">Enter Your Referral Mobile Number *</label>
          <input
            type="text"
            name="introducerSearch"
            value={searchQuery}
            onChange={(e) => handleSearchIntroducer(e.target.value)}
            required
            className="form-input"
            placeholder="Enter 10 Digits Mobile Number"
            autoComplete="off"
          />
          {searchLoading && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Searching...
            </div>
          )}
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 1000,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              {searchResults.map(user => (
                <div
                  key={user._id}
                  onClick={() => selectIntroducer(user)}
                  style={{
                    padding: '10px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: 'white',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                >
                  <div style={{ fontWeight: '500' }}>{user.displayName || user.name}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{user.mobile}</div>
                </div>
              ))}
            </div>
          )}
          {showDropdown && searchResults.length === 0 && searchQuery.length >= 3 && !searchLoading && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'white',
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '10px',
              zIndex: 1000,
              color: '#666',
              fontSize: '14px'
            }}>
              No members found with this mobile number
            </div>
          )}
          {formData.introducerName && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              backgroundColor: '#e8f5e9',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#2e7d32'
            }}>
              ✓ Selected: {formData.introducerName} ({formData.introducerMobile})
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          disabled={loading}
          className="form-button"
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div className="form-link">
        Already have an account? <Link to="/login">Login here</Link>
      </div>

      {/* User Type Selection Modal */}
      {showUserTypeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'white',
            padding: '40px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h2 style={{
              marginTop: 0,
              marginBottom: '10px',
              color: '#333',
              fontSize: '24px',
              textAlign: 'center'
            }}>Select Your User Type</h2>
            <p style={{
              color: '#666',
              textAlign: 'center',
              marginBottom: '30px',
              fontSize: '14px'
            }}>
              Please choose how you want to register
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button
                onClick={() => handleUserTypeSelection('channelpartner')}
                style={{
                  padding: '20px',
                  border: '2px solid #3b82f6',
                  background: 'white',
                  color: '#3b82f6',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#3b82f6';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.color = '#3b82f6';
                }}
              >
                <div style={{ fontSize: '18px', marginBottom: '5px' }}>🤝 Channel Partner</div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>Join as a business partner and grow your network</div>
              </button>

              <button
                onClick={() => handleUserTypeSelection('customer')}
                style={{
                  padding: '20px',
                  border: '2px solid #10b981',
                  background: 'white',
                  color: '#10b981',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#10b981';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.color = '#10b981';
                }}
              >
                <div style={{ fontSize: '18px', marginBottom: '5px' }}>👤 Customer</div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>Register as a customer to access services</div>
              </button>

              <button
                onClick={() => handleUserTypeSelection('both')}
                style={{
                  padding: '20px',
                  border: '2px solid #f59e0b',
                  background: 'white',
                  color: '#f59e0b',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f59e0b';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.color = '#f59e0b';
                }}
              >
                <div style={{ fontSize: '18px', marginBottom: '5px' }}>⭐ Both</div>
                <div style={{ fontSize: '13px', opacity: 0.8 }}>Register as both channel partner and customer</div>
              </button>

              <button
                onClick={() => setShowUserTypeModal(false)}
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  background: 'white',
                  color: '#666',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignUp;