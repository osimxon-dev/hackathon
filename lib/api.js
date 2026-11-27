// Frontend uchun API mijozi: barcha xatolarni bir xil ApiError shakliga keltiradi.

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details || {};
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ApiError("Serverga ulanib bo'lmadi. Internet aloqasini tekshiring", 0);
  }
  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // javob JSON emas
  }
  if (!response.ok) {
    throw new ApiError(payload?.error || `So'rov bajarilmadi (${response.status})`, response.status, payload?.details);
  }
  return payload;
}

function qs(params = {}) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
}

export const api = {
  stats: () => request('GET', '/stats'),
  activity: (params) => request('GET', `/activity${qs(params)}`),
  specialties: () => request('GET', '/specialties'),
  nearest: (params) => request('GET', `/slots/nearest${qs(params)}`),

  doctors: (params) => request('GET', `/doctors${qs(params)}`),
  doctor: (id) => request('GET', `/doctors/${id}`),
  doctorSlots: (id, date) => request('GET', `/doctors/${id}/slots${qs({ date })}`),
  createDoctor: (data) => request('POST', '/doctors', data),
  updateDoctor: (id, data) => request('PATCH', `/doctors/${id}`, data),
  deleteDoctor: (id) => request('DELETE', `/doctors/${id}`),

  appointments: (params) => request('GET', `/appointments${qs(params)}`),
  book: (data) => request('POST', '/appointments', data),
  updateAppointment: (id, data) => request('PATCH', `/appointments/${id}`, data),
  deleteAppointment: (id) => request('DELETE', `/appointments/${id}`),
};
