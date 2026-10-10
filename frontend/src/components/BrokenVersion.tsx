import React, { useState } from 'react';
import type { Task, TaskFormPayload } from '../types';

interface BrokenVersionProps {
  tasks: Task[];
  onCreateTask: (payload: TaskFormPayload, forceFailure?: boolean) => Promise<boolean>;
  isLoading: boolean;
  serverError: string | null;
  onClearError: () => void;
}

export const BrokenVersion: React.FC<BrokenVersionProps> = ({
  tasks,
  onCreateTask,
  isLoading,
  serverError,
  onClearError,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('Todo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // In Broken Version mode, we explicitly trigger the controlled backend failure
    const success = await onCreateTask(
      {
        title: title.trim(),
        description: description.trim(),
        assignee: assignee.trim(),
        status,
      },
      true // forceFailure = true
    );

    if (success) {
      setTitle('');
      setDescription('');
      setAssignee('');
      setStatus('Todo');
      setIsModalOpen(false);
    }
  };

  return (
    <div id="broken-version-container" className="version-container">
      {/* Controlled Failure Warning Banner */}
      <div className="mode-banner error-banner">
        <div>
          <strong>Broken Version — Controlled Backend Failure Mode:</strong> Any task creation attempt in this mode deterministically triggers an HTTP 500 internal server error. This proves the system correctly identifies real backend application failures.
        </div>
        <span className="badge" style={{ background: '#FFF0EF', color: 'var(--danger)', borderColor: '#FFCDD2' }}>
          Simulating HTTP 500
        </span>
      </div>

      {/* Visible Server Error Alert */}
      {serverError && (
        <div id="error-alert" data-testid="error-message" className="alert-error">
          <div style={{ fontSize: '1.25rem' }}>✕</div>
          <div>
            <strong>Backend Error Encountered (HTTP 500)</strong>
            <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{serverError}</p>
          </div>
          <button
            onClick={onClearError}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Action Header matching Version A */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>Tasks & Milestones (Broken Mode)</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            UI matches Version A, but backend task creation is set to fail deterministically.
          </p>
        </div>
        <button
          id="create-task-btn"
          data-testid="create-task-button"
          className="btn-primary"
          style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
          onClick={() => setIsModalOpen(true)}
        >
          <span>⚠️</span> Create Task (Will Fail)
        </button>
      </div>

      {/* Task Grid */}
      <div id="tasks-list" className="task-grid">
        {tasks.map((task) => (
          <div key={task.id} id={`task-item-${task.id}`} className="task-card" data-testid="task-item">
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  #{task.id}
                </span>
                <span className="badge badge-todo">{task.status}</span>
              </div>
              <h3 className="task-card-title">{task.title}</h3>
              <p className="task-card-desc">{task.description || 'No description provided.'}</p>
            </div>

            <div className="task-card-footer">
              <span className="task-assignee">👤 {task.assignee}</span>
              <span style={{ color: 'var(--text-muted)' }}>
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal with standard selectors */}
      {isModalOpen && (
        <div className="modal-overlay" id="task-modal-overlay">
          <div className="modal-card" id="task-modal">
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Create New Task</h2>
              <button
                id="close-modal-x"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem' }}
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ background: '#FFF5F5', border: '1px solid #FFD0CE', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: '0.825rem', color: '#B91C1C' }}>
                  Notice: Submitting this form will send <code>X-Simulate-Backend-Failure: true</code> to the backend, provoking a 500 error.
                </div>

                <div className="form-group">
                  <label htmlFor="task-title-input" className="form-label">
                    Task Title *
                  </label>
                  <input
                    id="task-title-input"
                    name="title"
                    className="form-input"
                    placeholder="Enter task title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="task-desc-input" className="form-label">
                    Description
                  </label>
                  <textarea
                    id="task-desc-input"
                    name="description"
                    rows={3}
                    className="form-textarea"
                    placeholder="Implementation details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="task-assignee-input" className="form-label">
                      Assignee *
                    </label>
                    <input
                      id="task-assignee-input"
                      name="assignee"
                      className="form-input"
                      placeholder="e.g., Alex QA"
                      value={assignee}
                      onChange={(e) => setAssignee(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-status-select" className="form-label">
                      Status
                    </label>
                    <select
                      id="task-status-select"
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
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  id="cancel-task-btn"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-task-btn"
                  className="btn-primary"
                  style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Simulating Call...' : 'Save Task (Trigger 500)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
