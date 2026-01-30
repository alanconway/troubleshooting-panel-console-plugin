import { getCSRFToken } from '@openshift-console/dynamic-plugin-sdk/lib/utils/fetch/console-fetch-utils';
import { Console, Goals, Korrel8rClient, Neighbors } from './korrel8r/client';

const BASE = '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r/api/v1alpha1';
const headers = () => ({ Accept: 'application/json', 'X-CSRFToken': getCSRFToken() });

const client = () => new Korrel8rClient({ HEADERS: headers(), BASE });

export const listDomains = () => {
  return client().query.listDomains();
};

export const getNeighborsGraph = (neighbours: Neighbors) => {
  return client().correlate.graphNeighbours(neighbours);
};

export const getGoalsGraph = (goals: Goals) => {
  return client().correlate.graphGoals(goals);
};

export const setConsole = (console: Console) => {
  return client().console.setConsole(console);
};

// Subscribe to console updates. Returns a cancel() function.
export const consoleUpdates = (
  onMessage: (data: string) => void,
  onError: (error: Error) => void,
): (() => void) => {
  return eventStream(BASE + '/console/updates', onMessage, onError);
};

/**
 * Subscribe to console SSE events with authenticated fetch.
 * Uses fetch instead of EventSource because EventSource doesn't support custom headers
 * (X-CSRFToken) required by the OpenShift Console proxy.
 * Returns a cleanup function that aborts the connection.
 */
export const eventStream = (
  url: string | URL,
  onMessage: (data: string) => void,
  onError: (error: Error | string) => void,
  { minDelay, maxDelay } = { minDelay: 100, maxDelay: 1000 },
): (() => void) => {
  const controller = new AbortController();
  const dataPrefix = 'data: ';

  // Loop making fetch requests, reconnect with exponential backoff.
  const fetchLoop = async () => {
    let backoff = minDelay;
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(url, { headers: headers(), signal: controller.signal });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) {
            backoff = minDelay; // Reset backoff on success
            break;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // Keep last unfinished line for next read
          for (const line of lines) {
            if (line.startsWith(dataPrefix)) {
              const data = line.slice(dataPrefix.length);
              onMessage(data);
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return; // Exit on cancel
        onError(err instanceof Error ? err : new Error(String(err)));
        backoff = Math.min(backoff * 2, maxDelay);
      }
      await delay(backoff);
    }
  };
  fetchLoop();

  return () => controller.abort();
};

const delay = (duration: number): Promise<void> => {
  return new Promise((r) => setTimeout(r, duration));
};
