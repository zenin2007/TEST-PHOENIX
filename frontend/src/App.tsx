import { useState, useEffect, useCallback } from 'react';
import type { Task, DemoMode, TaskFormPayload } from './types';
import { Navbar } from './components/Navbar';
import { VersionA } from './components/VersionA';
import { VersionB } from './components/VersionB';
import { BrokenVersion } from './components/BrokenVersion';

export function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMode, setCurrentMode] = useState<DemoMode>(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'version-b') return 'version-b';
    if (modeParam === 'broken') return 'broken';
    return 'version-a';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Synchronize mode with URL query params
  const handleSelectMode = (mode: DemoMode) => {
    setCurrentMode(mode);
    setServerError(null);
    setSuccessMessage(null);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    window.history.pushState({}, '', url.toString());
  };

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) {
        throw new Error(`Failed to load tasks: HTTP ${res.status}`);
      }
      const data = await res.json();
      setTasks(data);
      setBackendHealthy(true);
    } catch {
      setBackendHealthy(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (
    payload: TaskFormPayload,
    forceFailure: boolean = false
  ): Promise<boolean> => {
    setIsLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (forceFailure || currentMode === 'broken') {
      headers['X-Simulate-Backend-Failure'] = 'true';
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorDetail = `HTTP ${res.status} ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData.detail) {
            if (typeof errData.detail === 'string') {
              errorDetail = errData.detail;
            } else if (errData.detail.message) {
              errorDetail = `${errData.detail.message} (${errData.detail.error_code || 'ERROR'})`;
            }
          }
        } catch {
          // fallback to status code
        }
        setServerError(errorDetail);
        return false;
      }

      await fetchTasks();
      setSuccessMessage(`Task "${payload.title}" created and persisted successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network failure';
      setServerError(`Network connection error: ${msg}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const res = await fetch('/api/test/reset', { method: 'POST' });
      if (res.ok) {
        await fetchTasks();
        setServerError(null);
        setSuccessMessage('Demo SQLite database successfully reset to clean seed state.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch {
      setServerError('Failed to reset demo data.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="app-root">
      <Navbar
        currentMode={currentMode}
        onSelectMode={handleSelectMode}
        onResetData={handleResetData}
        isResetting={isResetting}
        backendHealthy={backendHealthy}
      />

      <main className="main-content">
        {successMessage && (
          <div id="success-alert" data-testid="success-message" className="alert-success">
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {currentMode === 'version-a' && (
          <VersionA
            tasks={tasks}
            onCreateTask={handleCreateTask}
            isLoading={isLoading}
          />
        )}

        {currentMode === 'version-b' && (
          <VersionB
            tasks={tasks}
            onCreateTask={handleCreateTask}
            isLoading={isLoading}
          />
        )}

        {currentMode === 'broken' && (
          <BrokenVersion
            tasks={tasks}
            onCreateTask={handleCreateTask}
            isLoading={isLoading}
            serverError={serverError}
            onClearError={() => setServerError(null)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
