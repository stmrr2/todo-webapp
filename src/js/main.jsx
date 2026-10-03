import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { Auth } from './Auth.jsx';
import { TodoApp } from './TodoApp.jsx';

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('todo-session'));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (session) sessionStorage.setItem('todo-session', JSON.stringify(session));
    else sessionStorage.removeItem('todo-session');
  }, [session]);

  return (
    <div className="page-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">FULL-STACK WEB APPLICATION</p>
          <h1>ToDo Web App</h1>
          <p className="subtitle">タスク・締切・メモをまとめて管理できます。</p>
        </div>
      </header>

      {session ? (
        <TodoApp session={session} onLogout={() => setSession(null)} />
      ) : (
        <Auth onAuthenticated={setSession} />
      )}

      <footer>
        React / Express / MongoDB / JWT
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
