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
  const [topIntroducers, setTopIntroducers] = useState([]);
  
  // Calculate dynamic dates
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    
    // Fetch promotional images and top introducers
    fetchPromoImages();
    fetchTopIntroducers();
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

  const fetchTopIntroducers = async () => {
    try {
      const response = await api.get('/admin/public-top-introducers');
      setTopIntroducers(response.data.topIntroducers || []);
    } catch (err) {
      console.error('Error fetching top introducers:', err);
      setTopIntroducers([]);
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
              🚪 Logout
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
              🚪 Logout
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

      {/* Top Introducers Section */}
      {topIntroducers.length > 0 && (
        <div className="top-introducers-section">
          <div className="section-header">
            <h2 className="section-title">🏆 Top Introducers</h2>
            <p className="section-subtitle">Leading members who are helping grow our community</p>
          </div>
          
          <div className="introducers-ranking">
            {topIntroducers.map((introducer, index) => (
              <div key={introducer._id} className={`introducer-card rank-${index + 1}`}>
                <div className="rank-badge">
                  <span className="rank-number">#{index + 1}</span>
                  {index === 0 && <span className="crown">👑</span>}
                  {index === 1 && <span className="medal">🥈</span>}
                  {index === 2 && <span className="medal">🥉</span>}
                </div>
                
                <div className="introducer-info">
                  <div className="introducer-name">{introducer.name}</div>
                  <div className="introducer-display">@{introducer.displayName}</div>
                  <div className="introducer-mobile">{introducer.mobile}</div>
                </div>
                
                <div className="referral-stats">
                  <div className="referral-count">{introducer.count}</div>
                  <div className="referral-label">referrals</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
    </div>
  );
};

export default Home;