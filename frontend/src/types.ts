export interface Task {
  id: number;
  title: string;
  description: string;
  assignee: string;
  status: 'Todo' | 'In Progress' | 'Done' | string;
  created_at: string;
}

export type NavigationTab =
  | 'showcase'
  | 'overview'
  | 'tests'
  | 'runs'
  | 'recovery'
  | 'analytics'
  | 'healing-memory'
  | 'environments'
  | 'settings';

export type DemoMode = 
  | NavigationTab
  | 'self-healing'
  | 'dashboard'
  | 'version-a' 
  | 'version-b' 
  | 'broken' 
  | 'ambiguous' 
  | 'shopping-a' 
  | 'shopping-b' 
  | 'test-runner';

export interface TaskFormPayload {
  title: string;
  description: string;
  assignee: string;
  status: string;
}

export interface Order {
  id: number;
  product_name: string;
  price: number;
  quantity: number;
  customer_name: string;
  status: string;
  created_at: string;
}

export type TestResultStatus = 'PASS' | 'SELF-HEALED' | 'FAIL' | 'HUMAN REVIEW REQUIRED' | string;

export interface TestRun {
  id: number;
  scenario: string;
  status: TestResultStatus;
  original_locator: string | null;
  original_locator_worked: boolean;
  initial_failure_reason: string | null;
  replacement_selector: string | null;
  candidate_score: number | null;
  recovery_actions: string | null;
  verification_result: string | null;
  diagnostics_json?: string;
  original_intent?: string;
  detected_differences?: string;
  reconstructed_workflow?: string;
  execution_duration_ms?: number;
  created_at: string;
}

export interface CandidateEvaluation {
  selector: string;
  tag_name?: string;
  score?: {
    total_score: number;
    semantic_score?: number;
    role_score?: number;
    text_score?: number;
    context_score?: number;
    structural_score?: number;
  };
  text_content?: string;
  role?: string;
  confidence?: number;
}

export interface StepDiagnostic {
  intent?: string;
  name?: string;
  action?: string;
  status?: string;
  diagnostics?: {
    rationale?: string;
    failure_category?: string;
    candidates_evaluated?: CandidateEvaluation[];
    selected_candidate?: { selector: string };
  };
}

export interface HealingMemoryRecord {
  id?: number;
  original_intent: string;
  original_locator: string;
  recovered_locator: string;
  element_fingerprint?: string;
  context?: string;
  confidence: number;
  verified: number | boolean;
  timestamp: string;
}

export interface EvaluationScenario {
  iteration: number;
  scenario_name: string;
  original_intent: string;
  ui_change_type: string;
  original_locator_result: string;
  recovery_decision: string;
  reconstructed_steps: string;
  verification_evidence: string;
  final_status: string;
  execution_duration_ms: number;
}

export interface EvaluationSummary {
  total_scenarios_executed: number;
  iterations_count: number;
  original_test_failures_caused_by_ui_changes: number;
  successful_recoveries: number;
  failed_recoveries: number;
  incorrect_recovery_attempts: number;
  human_review_cases: number;
  genuine_failures_correctly_classified: number;
  average_execution_time_ms: number;
  recovery_success_rate_percent: number;
  total_suite_execution_time_seconds: number;
  metric_definitions?: Record<string, string>;
}

export interface EvaluationReport {
  summary: EvaluationSummary;
  scenarios: EvaluationScenario[];
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  domain: 'Task Management' | 'E-Commerce' | 'Edge Scenarios';
  intent: string;
  baselineSelector: string;
  redesignSelector: string;
  expectedStatus: TestResultStatus;
  endpoint: string;
  description: string;
}

export interface LiveTestRequest {
  test_name: string;
  website_url: string;
  intent: string;
  expected_outcome: string;
  timeout_ms?: number;
}

export interface ExecutionEvent {
  timestamp: string;
  action: string;
  target: string;
  status: string;
  url?: string;
  evidence?: string;
  error?: string;
}

export interface LiveDomSummary {
  total_interactive_elements: number;
  buttons_count: number;
  inputs_count: number;
  links_count: number;
  sample_elements: Array<{
    selector: string;
    tag_name: string;
    role: string;
    accessible_name: string;
    is_visible: boolean;
    is_enabled: boolean;
  }>;
}

export interface LiveAccessibilitySummary {
  root_role: string;
  root_name: string;
  nodes_count: number;
  has_accessible_tree: boolean;
}

export interface CandidateScoreBreakdown {
  semantic: number;
  role: number;
  text: number;
  context: number;
  structural: number;
}

export interface CandidateReport {
  selector: string;
  accessible_name?: string;
  role: string;
  tag_name: string;
  is_visible: boolean;
  is_enabled: boolean;
  score: number;
  score_breakdown?: CandidateScoreBreakdown;
}

export interface ActionReport {
  intent: string;
  action_type: string;
  target_description: string;
  original_locator?: string;
  original_locator_worked: boolean;
  failure_reason?: string;
  recovered_action?: string;
  candidates: CandidateReport[];
  selected_candidate?: string;
  score?: number;
  score_breakdown?: CandidateScoreBreakdown;
  safety_decision: string;
  execution_result: string;
  verification_result: string;
  duration_ms: number;
}

export interface LiveTestResponse {
  run_id: string;
  test_name: string;
  website_url: string;
  actual_url: string;
  page_title: string;
  intent: string;
  expected_outcome: string;
  status: string;
  execution_duration_ms: number;
  events: ExecutionEvent[];
  actions?: ActionReport[];
  self_healed_count?: number;
  verification_evidence?: string;
  screenshot_base64?: string;
  dom_summary: LiveDomSummary;
  accessibility_summary: LiveAccessibilitySummary;
  error?: string;
}

