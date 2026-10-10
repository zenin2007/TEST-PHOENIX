import React, { useState } from 'react';
import type { Task, TaskFormPayload } from '../types';

interface VersionBProps {
  tasks: Task[];
  onCreateTask: (payload: TaskFormPayload) => Promise<boolean>;
  isLoading: boolean;
}

export const VersionB: React.FC<VersionBProps> = ({ tasks, onCreateTask, isLoading }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('Todo');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Work item title is mandatory');
      return;
    }
    if (!assignee.trim()) {
      setFormError('Owner / assignee is mandatory');
      return;
    }

    setFormError(null);
    const success = await onCreateTask({
      title: title.trim(),
      description: description.trim(),
      assignee: assignee.trim(),
      status,
    });

    if (success) {
      setTitle('');
      setDescription('');
      setAssignee('');
      setStatus('Todo');
      setIsDrawerOpen(false);
    }
  };

  return (
    <div id="version-b-container" className="version-b-root">
      {/* Informative Banner */}
      <div className="mode-banner purple-banner">
        <div>
          <strong>Version B: Redesigned UI</strong> — Interface layout redesigned with sidebar action panel and slide-out composer.
        </div>
        <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.25)', color: '#c4b5fd' }}>
          UI Redesign Challenge
        </span>
      </div>

      <div className="redesign-layout">
        {/* Left Sidebar Action Panel (Different DOM position & ID) */}
        <aside className="redesign-sidebar" id="workspace-sidebar">
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f3e8ff' }}>Workspace Actions</h2>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Agile delivery stream</p>
          </div>

          <div className="sidebar-action-box">
            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem' }}>
              Have a new feature or chore to schedule?
            </p>
            {/* The renamed button with new HTML ID */}
            <button
              id="new-work-item-btn"
              data-testid="new-work-item-button"
              className="btn-accent"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setIsDrawerOpen(true)}
            >
              <span>✨</span> New Work Item
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #334155' }}>
              <span>Total Items</span>
              <strong style={{ color: '#fff' }}>{tasks.length}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0' }}>
              <span>Completed</span>
              <strong style={{ color: '#34d399' }}>{tasks.filter(t => t.status === 'Done').length}</strong>
            </div>
          </div>
        </aside>

        {/* Right Main Content Area */}
        <main className="redesign-main-content">
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Active Work Items
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Redesigned card deck synced with shared backend storage.
            </p>
          </div>

          <div id="work-items-grid" className="task-grid">
            {tasks.map((task) => (
              <div
                key={task.id}
                id={`work-item-${task.id}`}
                className="redesign-card"
                data-testid="work-item-card"
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>
                      ITEM-{task.id}
                    </span>
                    <span
                      className={`badge ${
                        task.status === 'Done'
                          ? 'badge-done'
                          : task.status === 'In Progress'
                          ? 'badge-in-progress'
                          : 'badge-todo'
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.5rem' }}>
                    {task.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem', lineHeight: 1.4 }}>
                    {task.description || 'No additional details.'}
                  </p>
                </div>

                <div className="task-card-footer">
                  <span style={{ color: '#e2e8f0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }}></span>
                    {task.assignee}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* Slide-out Drawer for Version B */}
      {isDrawerOpen && (
        <div className="modal-overlay" id="workitem-drawer-overlay">
          <div className="drawer-slideover" id="workitem-slideover">
            <div className="modal-header" style={{ borderBottomColor: 'rgba(139, 92, 246, 0.3)' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f3e8ff' }}>Compose Work Item</h2>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Redesigned item creation sheet</span>
              </div>
              <button
                id="close-drawer-btn"
                style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: '1.25rem' }}
                onClick={() => setIsDrawerOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <div style={{ padding: '1.5rem', flexGrow: 1, overflowY: 'auto' }}>
                {formError && (
                  <div className="alert-error" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="workitem-title-input" className="form-label" style={{ color: '#c4b5fd' }}>
                    Item Title *
                  </label>
                  <input
                    id="workitem-title-input"
                    name="title"
                    className="form-input"
                    placeholder="Enter short descriptive title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="workitem-desc-input" className="form-label" style={{ color: '#c4b5fd' }}>
                    Scope & Description
                  </label>
                  <textarea
                    id="workitem-desc-input"
                    name="description"
                    rows={4}
                    className="form-textarea"
                    placeholder="Detailed specifications and requirements..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="workitem-owner-input" className="form-label" style={{ color: '#c4b5fd' }}>
                    Lead Assignee / Owner *
                  </label>
                  <input
                    id="workitem-owner-input"
                    name="assignee"
                    className="form-input"
                    placeholder="Team member responsible..."
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="workitem-stage-select" className="form-label" style={{ color: '#c4b5fd' }}>
                    Workflow Stage
                  </label>
                  <select
                    id="workitem-stage-select"
                    name="status"
                    className="form-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ borderTopColor: 'rgba(139, 92, 246, 0.3)' }}>
                <button
                  type="button"
                  id="cancel-workitem-btn"
                  className="btn-secondary"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  Dismiss
                </button>
                <button
                  type="submit"
                  id="submit-workitem-btn"
                  className="btn-accent"
                  disabled={isLoading}
                >
                  {isLoading ? 'Publishing...' : 'Add Work Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
