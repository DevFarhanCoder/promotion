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
    profilePhoto: null,
    introducerId: '',
    introducerMobile: '',
    introducerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profilePhoto') {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
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

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('name', formData.name);
      submitData.append('mobile', formData.mobile);
      submitData.append('displayName', formData.displayName);
      submitData.append('password', formData.password);
      submitData.append('introducerId', formData.introducerId);
      submitData.append('introducerMobile', formData.introducerMobile);
      submitData.append('introducerName', formData.introducerName);
      
      if (formData.profilePhoto) {
        submitData.append('profilePhoto', formData.profilePhoto);
      }

      const response = await api.post('/auth/signup', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

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
          <label className="form-label">Profile Photo (Optional)</label>
          <input
            type="file"
            name="profilePhoto"
            accept="image/*"
            onChange={handleChange}
            className="form-input file-input"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter your full name"
          />
        </div>

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
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Enter password (min 6 characters)"
            minLength="6"
          />
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
    </div>
  );
};

export default SignUp;