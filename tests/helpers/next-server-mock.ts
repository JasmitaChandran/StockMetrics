type JsonResponseInit = {
  status?: number;
  headers?: Record<string, string>;
};

class MockHeaders {
  private readonly values = new Map<string, string>();

  constructor(init?: Record<string, string>) {
    if (!init) return;
    for (const [key, value] of Object.entries(init)) {
      this.values.set(key.toLowerCase(), value);
    }
  }

  get(name: string) {
    return this.values.get(name.toLowerCase()) ?? null;
  }
}

class MockNextResponse {
  readonly status: number;
  readonly headers: MockHeaders;
  private readonly payload: unknown;

  constructor(payload: unknown, init?: JsonResponseInit) {
    this.payload = payload;
    this.status = init?.status ?? 200;
    this.headers = new MockHeaders(init?.headers);
  }

  async json() {
    return this.payload;
  }
}

export class NextRequest {
  readonly nextUrl: URL;
  private readonly bodyText: string | null;

  constructor(input: string, init?: { body?: unknown }) {
    this.nextUrl = new URL(input);
    if (typeof init?.body === 'string') {
      this.bodyText = init.body;
    } else if (init?.body === undefined || init?.body === null) {
      this.bodyText = null;
    } else {
      this.bodyText = String(init.body);
    }
  }

  async json() {
    if (this.bodyText === null) {
      throw new Error('No JSON body');
    }
    return JSON.parse(this.bodyText);
  }
}

export const NextResponse = {
  json(payload: unknown, init?: JsonResponseInit) {
    return new MockNextResponse(payload, init);
  },
};
