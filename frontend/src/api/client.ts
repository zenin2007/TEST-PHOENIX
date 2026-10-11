import type {
  Task,
  TaskFormPayload,
  Order,
  TestRun,
  HealingMemoryRecord,
  EvaluationReport,
  LiveTestRequest,
  LiveTestResponse,
} from '../types';


export class ApiService {
  private static baseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

  static async checkHealth(): Promise<{ status: string; failure_mode_active: boolean }> {
    const res = await fetch(`${this.baseUrl}/api/health`);
    if (!res.ok) throw new Error(`Health check failed: HTTP ${res.status}`);
    return res.json();
  }

  // Tasks
  static async getTasks(): Promise<Task[]> {
    const res = await fetch(`${this.baseUrl}/api/tasks`);
    if (!res.ok) throw new Error(`Failed to load tasks: HTTP ${res.status}`);
    return res.json();
  }

  static async createTask(payload: TaskFormPayload, simulateFailure = false): Promise<Task> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (simulateFailure) {
      headers['X-Simulate-Backend-Failure'] = 'true';
    }
    const res = await fetch(`${this.baseUrl}/api/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err.detail) {
          detail = typeof err.detail === 'string' ? err.detail : err.detail.message || detail;
        }
      } catch (_) {}
      throw new Error(detail);
    }
    return res.json();
  }

  // Orders
  static async getOrders(): Promise<Order[]> {
    const res = await fetch(`${this.baseUrl}/api/orders`);
    if (!res.ok) throw new Error(`Failed to load orders: HTTP ${res.status}`);
    return res.json();
  }

  static async createOrder(order: Partial<Order>): Promise<Order> {
    const res = await fetch(`${this.baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    if (!res.ok) throw new Error(`Failed to place order: HTTP ${res.status}`);
    return res.json();
  }

  // Test Runs & Scenarios
  static async getTestHistory(limit = 100): Promise<TestRun[]> {
    const res = await fetch(`${this.baseUrl}/api/tests/history?limit=${limit}`);
    if (!res.ok) throw new Error(`Failed to load test history: HTTP ${res.status}`);
    return res.json();
  }

  static async getTestRun(id: number): Promise<TestRun> {
    const res = await fetch(`${this.baseUrl}/api/tests/history/${id}`);
    if (!res.ok) throw new Error(`Failed to load test run #${id}: HTTP ${res.status}`);
    return res.json();
  }

  static async executeScenario(endpoint: string): Promise<TestRun> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err.detail) detail = err.detail;
      } catch (_) {}
      throw new Error(detail);
    }
    return res.json();
  }

  // Live Website Testing (Real Playwright Engine)
  static async runLiveTest(payload: LiveTestRequest): Promise<LiveTestResponse> {
    const res = await fetch(`${this.baseUrl}/api/tests/live`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err.detail) {
          if (typeof err.detail === 'string') {
            detail = err.detail;
          } else if (Array.isArray(err.detail) && err.detail[0]?.msg) {
            detail = err.detail[0].msg;
          } else if (err.detail.message) {
            detail = err.detail.message;
          }
        }
      } catch (_) {}
      throw new Error(detail);
    }
    return res.json();
  }


  // Healing Memory
  static async getHealingMemory(): Promise<HealingMemoryRecord[]> {
    const res = await fetch(`${this.baseUrl}/api/healing/memory`);
    if (!res.ok) throw new Error(`Failed to load healing memory: HTTP ${res.status}`);
    return res.json();
  }

  static async clearHealingMemory(): Promise<{ message: string }> {
    const res = await fetch(`${this.baseUrl}/api/healing/clear`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to clear healing memory: HTTP ${res.status}`);
    return res.json();
  }

  // Evaluation & Benchmark
  static async getLatestEvaluation(): Promise<EvaluationReport | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/evaluation/latest`);
      if (res.ok) return res.json();
      return null;
    } catch (_) {
      return null;
    }
  }

  static async triggerEvaluationRun(): Promise<EvaluationReport> {
    const res = await fetch(`${this.baseUrl}/api/evaluation/run`, { method: 'POST' });
    if (!res.ok) throw new Error(`Evaluation benchmark failed: HTTP ${res.status}`);
    return res.json();
  }

  // System
  static async resetDatabase(): Promise<{ message: string }> {
    const res = await fetch(`${this.baseUrl}/api/test/reset`, { method: 'POST' });
    if (!res.ok) throw new Error(`Database reset failed: HTTP ${res.status}`);
    return res.json();
  }
}
