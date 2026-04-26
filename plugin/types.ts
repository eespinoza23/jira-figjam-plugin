export interface JiraIssue {
  key: string;
  type: 'Epic' | 'Feature' | 'Story' | 'Bug';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  assignee: string;
  points: number | null;
  status: 'To Do' | 'In Progress' | 'Done';
  sprint: string;
  labels: string[];
  components: string[];
  epicLink: string | null;
  epicLinkTitle?: string | null;
  fixVersion: string;
  reporter: string;
  updated: string;
  description?: string;
  typeIconUrl?: string;
  priorityIconUrl?: string;
  lastSynced?: string;
  localChanges?: Record<string, unknown>;
}

export interface SearchResponse {
  issues: JiraIssue[];
  total: number;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AppState {
  authenticated: boolean;
  token: string | null;
  issues: JiraIssue[];
  imported: JiraIssue[];
  selected: Set<string>;
  diffs: Record<string, Record<string, unknown>>;
  loading: boolean;
  error: string | null;
  jiraInstance: string;
}

export interface FieldConfig {
  key: string;
  label: string;
  type: string;
  default: boolean;
}
