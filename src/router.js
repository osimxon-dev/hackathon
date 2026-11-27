/**
 * Kichik, bog'liqliksiz router: "/api/doctors/:id" kabi yo'llarni moslaydi.
 */
export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, handler) {
    const keys = [];
    const pattern = path
      .split('/')
      .map((part) => {
        if (part.startsWith(':')) {
          keys.push(part.slice(1));
          return '([^/]+)';
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    this.routes.push({ method, regex: new RegExp(`^${pattern}/?$`), keys, handler });
    return this;
  }

  get(path, handler) { return this.add('GET', path, handler); }
  post(path, handler) { return this.add('POST', path, handler); }
  put(path, handler) { return this.add('PUT', path, handler); }
  patch(path, handler) { return this.add('PATCH', path, handler); }
  delete(path, handler) { return this.add('DELETE', path, handler); }

  /**
   * @returns {{ handler: Function, params: Record<string,string> } | { allowed: string[] } | null}
   */
  match(method, pathname) {
    const allowed = [];
    for (const route of this.routes) {
      const m = route.regex.exec(pathname);
      if (!m) continue;
      if (route.method !== method) {
        allowed.push(route.method);
        continue;
      }
      const params = {};
      route.keys.forEach((key, i) => { params[key] = decodeURIComponent(m[i + 1]); });
      return { handler: route.handler, params };
    }
    return allowed.length ? { allowed } : null;
  }
}
