import React, { useState } from 'react';
import type { Task, TaskFormPayload } from '../types';

interface VersionAProps {
  tasks: Task[];
  onCreateTask: (payload: TaskFormPayload) => Promise<boolean>;
  isLoading: boolean;
}

export const VersionA: React.FC<VersionAProps> = ({ tasks, onCreateTask, isLoading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('Todo');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Task title is required');
      return;
    }
    if (!assignee.trim()) {
      setFormError('Assignee name is required');
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
      setIsModalOpen(false);
    }
  };

  return (
    <div id="version-a-container" className="version-container">
      {/* Informative Banner */}
      <div className="mode-banner info-banner">
        <div>
          <strong>Version A: Original UI</strong> — Standard baseline interface using canonical button labels and selectors.
        </div>
        <span className="badge badge-in-progress">Baseline Mode</span>
      </div>

      {/* Action Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>Tasks & Milestones</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage and track software engineering deliverables.
          </p>
        </div>
        <button
          id="create-task-btn"
          data-testid="create-task-button"
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          <span>＋</span> Create Task
        </button>
      </div>

      {/* Task Grid */}
      <div id="tasks-list" className="task-grid" data-testid="task-list">
        {tasks.map((task) => (
          <div
            key={task.id}
            id={`task-item-${task.id}`}
            data-testid="task-item"
            className="task-card"
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  #{task.id}
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
              <h3 className="task-card-title" data-testid="task-title">
                {task.title}
              </h3>
              <p className="task-card-desc">{task.description || 'No description provided.'}</p>
            </div>

            <div className="task-card-footer">
              <span className="task-assignee">
                👤 {task.assignee}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                {new Date(task.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Classic Modal */}
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
                {formError && (
                  <div className="alert-error" style={{ marginBottom: '1rem' }}>
                    {formError}
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="task-title-input" className="form-label">
                    Task Title *
                  </label>
                  <input
                    id="task-title-input"
                    name="title"
                    className="form-input"
                    placeholder="e.g., Integrate payment gateway"
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
                    placeholder="Detailed acceptance criteria or implementation notes..."
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
                      placeholder="e.g., Alex Chen"
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
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
