import * as kc from '../korrel8r/client';
import type { Goals, Neighbors, Console } from '../korrel8r/client';

// Mock the console-fetch-utils module
jest.mock('@openshift-console/dynamic-plugin-sdk/lib/utils/fetch/console-fetch-utils', () => ({
  getCSRFToken: () => 'test-csrf-token',
}));

// Mock createClient — returns a sentinel so we can verify it's passed through
const mockClient = { _mock: true };
jest.mock('../korrel8r/client/client', () => ({
  createClient: jest.fn(() => mockClient),
}));

// Mock the generated SDK functions — avoid jest.requireActual to prevent
// the real module from loading client.gen.ts (which calls createConfig at import time).
jest.mock('../korrel8r/client', () => ({
  listDomains: jest.fn(),
  graphNeighbours: jest.fn(),
  graphGoals: jest.fn(),
  setConsole: jest.fn(),
  consoleEvents: jest.fn(),
}));

// Import after mocks are set up
import {
  listDomains,
  getNeighborsGraph,
  getGoalsGraph,
  setConsole,
  consoleEvents,
} from '../korrel8r-client';
import { createClient } from '../korrel8r/client/client';

beforeEach(() => jest.clearAllMocks());

describe('listDomains', () => {
  it('calls kc.listDomains with client and signal', async () => {
    const domains = [{ name: 'k8s' }];
    (kc.listDomains as jest.Mock).mockResolvedValue(domains);

    const result = await listDomains();
    expect(result).toEqual(domains);
    expect(kc.listDomains).toHaveBeenCalledWith(
      expect.objectContaining({ client: mockClient, signal: expect.any(AbortSignal) }),
    );
  });

  it('returns a cancellable promise', () => {
    (kc.listDomains as jest.Mock).mockReturnValue(new Promise(() => {}));
    const promise = listDomains();
    expect(typeof promise.cancel).toBe('function');
  });

  it('cancel aborts the signal', () => {
    let capturedSignal: AbortSignal | undefined;
    (kc.listDomains as jest.Mock).mockImplementation(({ signal }) => {
      capturedSignal = signal;
      return new Promise(() => {});
    });

    const promise = listDomains();
    expect(capturedSignal?.aborted).toBe(false);
    promise.cancel();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe('getNeighborsGraph', () => {
  const neighbours: Neighbors = { depth: 2, start: { queries: ['k8s:Pod:{}'] } };

  it('calls kc.graphNeighbours with body and signal', async () => {
    const graph = { nodes: [], edges: [] };
    (kc.graphNeighbours as jest.Mock).mockResolvedValue(graph);

    const result = await getNeighborsGraph(neighbours);
    expect(result).toEqual(graph);
    expect(kc.graphNeighbours).toHaveBeenCalledWith(
      expect.objectContaining({
        client: mockClient,
        body: neighbours,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('cancel aborts the signal', () => {
    let capturedSignal: AbortSignal | undefined;
    (kc.graphNeighbours as jest.Mock).mockImplementation(({ signal }) => {
      capturedSignal = signal;
      return new Promise(() => {});
    });

    const promise = getNeighborsGraph(neighbours);
    expect(capturedSignal?.aborted).toBe(false);
    promise.cancel();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe('getGoalsGraph', () => {
  const goals: Goals = { goals: ['log:application'], start: { queries: ['k8s:Pod:{}'] } };

  it('calls kc.graphGoals with body and signal', async () => {
    const graph = { nodes: [], edges: [] };
    (kc.graphGoals as jest.Mock).mockResolvedValue(graph);

    const result = await getGoalsGraph(goals);
    expect(result).toEqual(graph);
    expect(kc.graphGoals).toHaveBeenCalledWith(
      expect.objectContaining({ client: mockClient, body: goals, signal: expect.any(AbortSignal) }),
    );
  });

  it('cancel aborts the signal', () => {
    let capturedSignal: AbortSignal | undefined;
    (kc.graphGoals as jest.Mock).mockImplementation(({ signal }) => {
      capturedSignal = signal;
      return new Promise(() => {});
    });

    const promise = getGoalsGraph(goals);
    expect(capturedSignal?.aborted).toBe(false);
    promise.cancel();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe('setConsole', () => {
  const consoleState: Console = { query: 'k8s:Pod:{}' };

  it('calls kc.setConsole with body and signal', async () => {
    (kc.setConsole as jest.Mock).mockResolvedValue(undefined);

    await setConsole(consoleState);
    expect(kc.setConsole).toHaveBeenCalledWith(
      expect.objectContaining({
        client: mockClient,
        body: consoleState,
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('cancel aborts the signal', () => {
    let capturedSignal: AbortSignal | undefined;
    (kc.setConsole as jest.Mock).mockImplementation(({ signal }) => {
      capturedSignal = signal;
      return new Promise(() => {});
    });

    const promise = setConsole(consoleState);
    expect(capturedSignal?.aborted).toBe(false);
    promise.cancel();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe('consoleEvents', () => {
  it('forwards string messages to onMessage', async () => {
    const messages: string[] = [];
    const events = ['event1', 'event2'];

    // Create an async iterable from the events array
    async function* generate() {
      for (const e of events) yield e;
    }

    (kc.consoleEvents as jest.Mock).mockResolvedValue({ stream: generate() });

    consoleEvents((data) => messages.push(data), jest.fn());

    // Let microtasks flush
    await new Promise((r) => setTimeout(r, 0));

    expect(messages).toEqual(['event1', 'event2']);
  });

  it('JSON-stringifies non-string messages', async () => {
    const messages: string[] = [];

    async function* generate() {
      yield { foo: 'bar' };
    }

    (kc.consoleEvents as jest.Mock).mockResolvedValue({ stream: generate() });

    consoleEvents((data) => messages.push(data), jest.fn());
    await new Promise((r) => setTimeout(r, 0));

    expect(messages).toEqual([JSON.stringify({ foo: 'bar' })]);
  });

  it('calls onError when stream setup fails', async () => {
    const error = new Error('connection failed');
    (kc.consoleEvents as jest.Mock).mockRejectedValue(error);

    const onError = jest.fn();
    consoleEvents(jest.fn(), onError);
    await new Promise((r) => setTimeout(r, 0));

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('suppresses error after cancel (abort)', async () => {
    const error = new Error('aborted');
    (kc.consoleEvents as jest.Mock).mockRejectedValue(error);

    const onError = jest.fn();
    // Cancel immediately before the rejection is handled
    const cancel = consoleEvents(jest.fn(), onError);
    cancel();
    await new Promise((r) => setTimeout(r, 0));

    expect(onError).not.toHaveBeenCalledWith(error);
  });

  it('returns a cancel function that aborts the signal', () => {
    let capturedSignal: AbortSignal | undefined;
    (kc.consoleEvents as jest.Mock).mockImplementation(({ signal }) => {
      capturedSignal = signal;
      return new Promise(() => {});
    });

    const cancel = consoleEvents(jest.fn(), jest.fn());
    expect(capturedSignal?.aborted).toBe(false);
    cancel();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it('passes onSseError that wraps non-Error values', () => {
    (kc.consoleEvents as jest.Mock).mockImplementation((opts) => {
      // Simulate an SSE error with a string
      opts.onSseError('sse failure');
      return new Promise(() => {});
    });

    const onError = jest.fn();
    consoleEvents(jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(new Error('sse failure'));
  });

  it('passes onSseError that forwards Error instances', () => {
    const sseError = new Error('real error');
    (kc.consoleEvents as jest.Mock).mockImplementation((opts) => {
      opts.onSseError(sseError);
      return new Promise(() => {});
    });

    const onError = jest.fn();
    consoleEvents(jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(sseError);
  });
});

describe('client configuration', () => {
  it('creates client with CSRF token and correct baseUrl', () => {
    (kc.listDomains as jest.Mock).mockReturnValue(new Promise(() => {}));
    listDomains();

    expect(createClient).toHaveBeenCalledWith({
      headers: { Accept: 'application/json', 'X-CSRFToken': 'test-csrf-token' },
      baseUrl: '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r/api/v1alpha1',
    });
  });
});
