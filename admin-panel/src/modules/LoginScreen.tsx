import React, { useState } from 'react';
import { login } from '../config/api';

interface LoginScreenProps {
  onLogin: (user: any) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('نام کاربری و رمز عبور را وارد کنید');
      return;
    }
    if (loading) return;

    setLoading(true);
    setError('');
    try {
      const user = await login(username.trim(), password);
      onLogin(user);
    } catch (err: any) {
      if (err?.message === 'Failed to fetch') {
        setError('خطا در اتصال به سرور — بک‌اند در دسترس نیست');
      } else {
        setError(err?.message || 'خطا در ورود به سیستم');
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    marginBottom: '14px',
    backgroundColor: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#f0f6fc',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    direction: 'ltr',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F0F0F 0%, #151520 50%, #0F0F0F 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'IRANSansX, Tahoma, sans-serif',
        direction: 'rtl',
        padding: 20,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 380,
          maxWidth: '100%',
          padding: '32px 36px 28px',
          background: '#161b22',
          borderRadius: 16,
          border: '1px solid #30363d',
          boxShadow: '0 20px 60px #0008, 0 0 40px #D4880E22',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 26,
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #D4880E, #b45309)',
          }}
        >
          عقرب
        </div>
        <h2 style={{ margin: '0 0 4px', color: '#f0f6fc', fontSize: 20, textAlign: 'center' }}>
          پنل مدیریت آذرمهر صنعت
        </h2>
        <p style={{ margin: '0 0 24px', color: '#8b949e', fontSize: 12, textAlign: 'center' }}>
          گروه محصولات غذایی عقرب
        </p>

        {error && (
          <div
            style={{
              background: '#FDECEA',
              color: '#C94B3F',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 13,
              direction: 'rtl',
              textAlign: 'right',
            }}
          >
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="نام کاربری"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="رمز عبور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          autoComplete="current-password"
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#8a6a2f' : '#d97706',
            color: '#fff',
            padding: '12px',
            border: 'none',
            borderRadius: 8,
            fontSize: 15,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            marginTop: 4,
          }}
        >
          {loading ? 'در حال ورود...' : 'ورود به سیستم'}
        </button>
      </form>
    </div>
  );
};
