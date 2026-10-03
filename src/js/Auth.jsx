import { useState } from 'react';

export function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || '処理に失敗しました');

      if (mode === 'register') {
        setMode('login');
        setPassword('');
        setError('登録しました。ログインしてください。');
        return;
      }

      onAuthenticated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <h2 id="auth-title">{mode === 'login' ? 'ログイン' : '新規登録'}</h2>
      <div className="auth-tabs" role="tablist" aria-label="認証方法">
        <button type="button" className={mode === 'login' ? 'active' : ''}
          onClick={() => { setMode('login'); setError(''); }}>ログイン</button>
        <button type="button" className={mode === 'register' ? 'active' : ''}
          onClick={() => { setMode('register'); setError(''); }}>新規登録</button>
      </div>

      <form onSubmit={submit}>
        <label>
          ユーザ名
          <input value={username} onChange={(e) => setUsername(e.target.value)}
            autoComplete="username" minLength="3" maxLength="30" required />
        </label>
        <label>
          パスワード
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength="6" maxLength="100" required />
        </label>
        {mode === 'register' && (
          <p className="form-note">公開デモでは、普段使っているパスワードは使用しないでください。</p>
        )}
        {error && <p className={error.startsWith('登録しました') ? 'message success' : 'message'}>{error}</p>}
        <button className="primary-button" disabled={busy}>
          {busy ? '処理中…' : mode === 'login' ? 'ログイン' : '登録'}
        </button>
      </form>
    </section>
  );
}
