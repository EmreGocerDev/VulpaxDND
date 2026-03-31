import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', background: '#1a1410',
          color: '#e8d5b7', fontFamily: 'serif', padding: 32, textAlign: 'center',
        }}>
          <h1 style={{ color: '#b89456', fontSize: 28, marginBottom: 16 }}>⚠ Bir Hata Oluştu</h1>
          <p style={{ color: '#a89278', marginBottom: 24, maxWidth: 500 }}>
            Uygulama beklenmeyen bir hatayla karşılaştı.
          </p>
          <div style={{
            background: '#2a0a0a', border: '1px solid #7a1c1c', borderRadius: 8,
            padding: 16, maxWidth: 600, width: '100%', textAlign: 'left',
            fontFamily: 'monospace', fontSize: 13, color: '#ff6b6b',
            maxHeight: 200, overflow: 'auto',
          }}>
            {this.state.error?.message || 'Bilinmeyen hata'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 24, padding: '10px 24px', background: '#7a1c1c',
              color: '#e8d5b7', border: 'none', borderRadius: 6, cursor: 'pointer',
              fontFamily: 'serif', fontSize: 16,
            }}
          >
            Yeniden Yükle
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
