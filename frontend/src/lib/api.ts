import { getGuestSessionId } from "@/lib/session";
import { getAccessToken, setAccessToken, clearAccessToken } from "@/lib/auth";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export interface EventResponse {
  id: string;
  title: string;
  slug: string;
  expires_at: string;
  start_time: string | null;
  created_at: string;
  cover_image_url: string | null;
  max_uploads: number;
  current_uploads: number;
  max_storage_bytes: number;
  current_storage_bytes: number;
  requires_password: boolean;
  event_url: string;
  host_id: string;
}

export interface EventCreatePayload {
  title: string;
  slug: string;
  expires_at: string;
  start_time?: string;
  cover_image_url?: string;
  max_uploads?: number;
  password?: string;
}

export interface EventUpdatePayload {
  expires_at?: string;
  start_time?: string;
  max_uploads?: number;
  cover_image_url?: string;
}

export interface UploadRequestPayload {
  guest_session_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

export interface UploadRequestResponse {
  upload_id: string;
  signed_url: string;
  object_key: string;
  expires_in: number;
}

export interface CompleteUploadPayload {
  upload_id: string;
  guest_session_id: string;
  file_size: number;
  compressed: boolean;
}

export interface UploadResponse {
  id: string;
  guest_session_id: string;
  file_url: string;
  object_key: string;
  compressed: boolean;
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface GalleryResponse {
  uploads: UploadResponse[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
}

interface QRResponse {
  url: string;
}

interface ApiRequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  eventPassword?: string;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readError(response: Response): Promise<ApiError> {
  const data: unknown = await response.json().catch(() => undefined);
  let detail = response.statusText || "request_failed";

  if (isRecord(data) && typeof data.detail === "string") {
    detail = data.detail;
  }

  return new ApiError(response.status, detail);
}

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  failedQueue = [];
};

async function doFetch(path: string, options: ApiRequestOptions): Promise<Response> {
  const headers = new Headers();
  headers.set("X-Session-ID", getGuestSessionId());

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.eventPassword) {
    headers.set("X-Event-Password", options.eventPassword);
  }

  if (!options.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  let response = await doFetch(path, options);

  if (response.status === 401 && !options.skipAuth && !options.skipRefresh && path !== "/auth/refresh" && path !== "/auth/login") {
    if (isRefreshing) {
      try {
        const token = await new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        response = await doFetch(path, options);
      } catch (err) {
        throw await readError(response);
      }
    } else {
      isRefreshing = true;
      try {
        const refreshRes = await doFetch("/auth/refresh", { method: "POST", skipAuth: true });
        if (!refreshRes.ok) {
          throw new Error("Refresh failed");
        }
        const data = await refreshRes.json();
        setAccessToken(data.access_token);
        processQueue(null, data.access_token);
        
        // Retry original request
        response = await doFetch(path, options);
      } catch (err) {
        processQueue(err, null);
        clearAccessToken();
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        }
        throw await readError(response);
      } finally {
        isRefreshing = false;
      }
    }
  }

  if (!response.ok) {
    throw await readError(response);
  }

  return (await response.json()) as T;
}

export function createEvent(payload: EventCreatePayload): Promise<EventResponse> {
  return apiRequest<EventResponse>("/events", { method: "POST", body: payload });
}

export function updateEvent(slug: string, payload: EventUpdatePayload, eventPassword?: string): Promise<EventResponse> {
  return apiRequest<EventResponse>(`/events/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: payload,
    eventPassword,
  });
}

export function getEventsBatch(slugs: string[]): Promise<EventResponse[]> {
  const query = slugs.map((s) => encodeURIComponent(s)).join(",");
  if (!query) return Promise.resolve([]);
  return apiRequest<EventResponse[]>(`/events/batch?slugs=${query}`);
}

export function getEvent(slug: string, password?: string): Promise<EventResponse> {
  const query = password ? `?password=${encodeURIComponent(password)}` : "";
  return apiRequest<EventResponse>(`/events/${encodeURIComponent(slug)}${query}`, {
    eventPassword: password,
    skipRefresh: true,
  });
}

export function getEventQr(slug: string): Promise<string> {
  return apiRequest<QRResponse>(`/events/${encodeURIComponent(slug)}/qr`).then((response) => response.url);
}

export function requestUpload(
  slug: string,
  payload: UploadRequestPayload,
  eventPassword?: string
): Promise<UploadRequestResponse> {
  return apiRequest<UploadRequestResponse>(`/events/${encodeURIComponent(slug)}/request-upload`, {
    method: "POST",
    body: payload,
    eventPassword,
    skipRefresh: true,
  });
}

export function completeUpload(
  slug: string,
  payload: CompleteUploadPayload,
  eventPassword?: string
): Promise<UploadResponse> {
  return apiRequest<UploadResponse>(`/events/${encodeURIComponent(slug)}/complete-upload`, {
    method: "POST",
    body: payload,
    eventPassword,
    skipRefresh: true,
  });
}

export function getGallery(
  slug: string,
  page = 1,
  limit = 20,
  password?: string
): Promise<GalleryResponse> {
  const search = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (password) {
    search.set("password", password);
  }
  return apiRequest<GalleryResponse>(`/events/${encodeURIComponent(slug)}/gallery?${search.toString()}`, {
    eventPassword: password,
  });
}

export function getDownloadZipUrl(slug: string, part: number = 0): string {
  const token = getAccessToken();
  const tokenParam = token ? `&token=${encodeURIComponent(token)}` : "";
  return `${API_URL}/events/${encodeURIComponent(slug)}/download-zip?part=${part}${tokenParam}`;
}

export function refreshAccessToken(): Promise<{ access_token: string }> {
  return apiRequest<{ access_token: string }>("/auth/refresh", { method: "POST", skipAuth: true });
}

export function login(payload: any): Promise<any> {
  return apiRequest("/auth/login", { method: "POST", body: payload, skipAuth: true });
}

export function register(payload: any): Promise<any> {
  return apiRequest("/auth/register", { method: "POST", body: payload, skipAuth: true });
}

export function logout(): Promise<any> {
  return apiRequest("/auth/logout", { method: "POST", skipAuth: true });
}

export function getMe(): Promise<any> {
  return apiRequest("/auth/me");
}

export function getMyEvents(): Promise<EventResponse[]> {
  return apiRequest<EventResponse[]>("/hosts/me/events");
}

export function friendlyApiError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Something interrupted the connection. Please try again.";
  }

  const messages: Record<string, string> = {
    event_not_found: "We could not find this event.",
    event_expired: "This event has ended. Thank you for being part of this day.",
    event_not_started: "This event hasn't started yet. Check back later!",
    wrong_password: "That password does not match this event.",
    password_required: "Enter the event password to continue.",
    file_type_not_allowed: "Only JPEG, PNG, HEIC, and WebP files are supported.",
    file_too_large: "Please upload photos under 20MB.",
    guest_upload_limit_reached: "You've shared 30 photos - thank you!",
    event_upload_cap_reached: "This event's photo limit has been reached.",
    event_storage_cap_reached: "This event's storage limit has been reached.",
    slug_already_exists: "That event link is already taken.",
    session_mismatch: "Please refresh this page before uploading again.",
  };

  return messages[error.detail] ?? "Something went wrong. Please try again.";
}
