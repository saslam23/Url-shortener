export type User = {id: string; email?: string};

export type Link ={
    id: string;
    code: string;
    target_url: string;
    created_at: string;
    expires_at?: string | null;
    short_url?: string;
};

export type Stats = {
    link: Link;
    total: number;
    perDay: {day:string; clicks: number[]};
    referrers: {referrer: string; clicks: number}[];
    devices: {device: string; clicks:number[]};
};

export class ApiError extends Error{
    status: number;
    constructor(status: number, message: string){
        super(message);
        this.status = status;
    }
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include", // sends and receives the auth cookie
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  // 204 (logout) has no body
  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}


const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });


export const api = {
  // auth
  me: () => request<User>("/auth/me"),
  login: (email: string, password: string) => post<unknown>("/auth/login", { email, password }),
  register: (email: string, password: string) => post<unknown>("/auth/register", { email, password }),
  logout: () => post<null>("/auth/logout"),

  // links (used by the dashboard step)
  listLinks: () => request<Link[]>("/links"),
  createLink: (targetUrl: string) => post<Link>("/links", { targetUrl }), // field name matches your Zod schema
  getStats: (id: string, days: number) => request<Stats>(`/links/${id}/stats?days=${days}`),
};