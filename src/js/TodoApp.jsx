import { useCallback, useEffect, useMemo, useState } from 'react';

const today = new Date().toISOString().slice(0, 10);

export function TodoApp({ session, onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ description: '', deadline: '', memo: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const headers = useMemo(() => ({ Authorization: `Bearer ${session.token}` }), [session.token]);

  const api = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
    if (response.status === 401) {
      onLogout();
      throw new Error('ログイン情報の有効期限が切れました');
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || `${response.status} ${response.statusText}`);
    }
    return response;
  }, [headers, onLogout]);

  const loadTasks = useCallback(async () => {
    try {
      setError('');
      const response = await api('/api/todos');
      setTasks(await response.json());
    } catch (err) {
      setError(err.message);
    }
  }, [api]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  async function addTask(event) {
    event.preventDefault();
    if (!description.trim()) return;
    setBusy(true);
    try {
      await api('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, deadline })
      });
      setDescription('');
      setDeadline('');
      await loadTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function patchTask(id, delta) {
    try {
      await api(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(delta)
      });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(task) {
    setEditingId(task._id);
    setEdit({
      description: task.description || '',
      deadline: task.deadline || '',
      memo: task.memo || ''
    });
  }

  async function saveEdit(id) {
    await patchTask(id, edit);
    setEditingId(null);
  }

  async function deleteTask(id) {
    try {
      await api(`/api/todos/${id}`, { method: 'DELETE' });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteCompleted() {
    try {
      await api('/api/todos/completed', { method: 'DELETE' });
      await loadTasks();
    } catch (err) {
      setError(err.message);
    }
  }

  const visibleTasks = showCompleted ? tasks : tasks.filter((task) => !task.completed);
  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <section className="todo-panel">
      <div className="toolbar">
        <div>
          <span className="user-label">ユーザ: {session.username}</span>
          <p className="summary">{tasks.length}件 / 完了 {completedCount}件</p>
        </div>
        <button type="button" className="secondary-button" onClick={onLogout}>ログアウト</button>
      </div>

      <form className="add-task" onSubmit={addTask}>
        <input aria-label="新しいタスク" placeholder="新しいタスク" value={description}
          onChange={(e) => setDescription(e.target.value)} maxLength="200" />
        <input aria-label="締切日" type="date" value={deadline}
          onChange={(e) => setDeadline(e.target.value)} />
        <button className="primary-button" disabled={busy || !description.trim()}>追加</button>
      </form>

      <div className="list-actions">
        <label className="check-label">
          <input type="checkbox" checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)} />
          完了済みも表示
        </label>
        {completedCount > 0 && (
          <button type="button" className="text-button danger" onClick={deleteCompleted}>完了済みを一括削除</button>
        )}
      </div>

      {error && <p className="message">{error}</p>}

      <div className="task-list">
        {visibleTasks.length === 0 ? (
          <p className="empty-state">表示するタスクはありません。</p>
        ) : visibleTasks.map((task) => {
          const overdue = !task.completed && task.deadline && task.deadline < today;
          const editing = editingId === task._id;
          return (
            <article key={task._id} className={`task-card${task.completed ? ' completed' : ''}${overdue ? ' overdue' : ''}`}>
              {editing ? (
                <div className="edit-grid">
                  <input aria-label="タスク内容" value={edit.description}
                    onChange={(e) => setEdit({ ...edit, description: e.target.value })} maxLength="200" />
                  <input aria-label="締切日" type="date" value={edit.deadline}
                    onChange={(e) => setEdit({ ...edit, deadline: e.target.value })} />
                  <input aria-label="メモ" placeholder="メモ" value={edit.memo}
                    onChange={(e) => setEdit({ ...edit, memo: e.target.value })} maxLength="500" />
                  <div className="task-buttons">
                    <button type="button" className="primary-button small" onClick={() => saveEdit(task._id)}>保存</button>
                    <button type="button" className="secondary-button small" onClick={() => setEditingId(null)}>キャンセル</button>
                  </div>
                </div>
              ) : (
                <>
                  <input className="task-check" type="checkbox" checked={Boolean(task.completed)}
                    onChange={(e) => patchTask(task._id, { completed: e.target.checked })}
                    aria-label={`${task.description}を完了にする`} />
                  <div className="task-main">
                    <strong>{task.description}</strong>
                    <div className="task-meta">
                      {task.deadline && <span>締切: {task.deadline}</span>}
                      {task.memo && <span>メモ: {task.memo}</span>}
                      {overdue && <span className="overdue-label">期限超過</span>}
                    </div>
                  </div>
                  <div className="task-buttons">
                    <button type="button" className="secondary-button small" onClick={() => startEdit(task)}>編集</button>
                    <button type="button" className="text-button danger" onClick={() => deleteTask(task._id)}>削除</button>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
