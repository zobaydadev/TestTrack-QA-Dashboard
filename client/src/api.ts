export interface User {
  id: number;
  email: string;
  role: 'admin' | 'tester';
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  test_case_count?: number;
}

export interface TestCase {
  id: number;
  project_id: number;
  title: string;
  steps: string | null;
  expected: string | null;
  priority: 'low' | 'medium' | 'high';
}

export type Status = 'pass' | 'fail' | 'blocked';

export interface RunSummary {
  id: number;
  name: string;
  created_at: string;
  pass: number;
  fail: number;
  blocked: number;
}

export interface Stats {
  testCases: number;
  runs: number;
  results: { pass: number; fail: number; blocked: number };
  passRate: number;
  byRun: RunSummary[];
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const BASE = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'testtrack_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

interface Options {
  method?: string;
  body?: unknown;
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = Array.isArray(data.details) && data.details.length > 0 ? `: ${data.details[0].message}` : '';
    throw new ApiError(res.status, `${data.error ?? 'Request failed'}${detail}`);
  }
  return data as T;
}
