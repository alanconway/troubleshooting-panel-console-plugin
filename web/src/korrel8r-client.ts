import { getCSRFToken } from '@openshift-console/dynamic-plugin-sdk/lib/utils/fetch/console-fetch-utils';
import * as kc from './korrel8r/client';
import { createClient } from './korrel8r/client/client';

const client = () =>
  createClient({
    headers: { Accept: 'application/json', 'X-CSRFToken': getCSRFToken() },
    baseUrl: '/api/proxy/plugin/troubleshooting-panel-console-plugin/korrel8r/api/v1alpha1',
  });

export type CancellablePromise<T> = Promise<T> & { cancel: () => void };

// Wrap a client call with an AbortController so the returned promise has a cancel() method.
const cancellable = <T>(fn: (signal: AbortSignal) => Promise<T>): CancellablePromise<T> => {
  const controller = new AbortController();
  const promise = fn(controller.signal) as CancellablePromise<T>;
  promise.cancel = () => controller.abort();
  return promise;
};

export const listDomains = () => {
  return cancellable((signal) => kc.listDomains({ client: client(), signal }));
};

export const getNeighborsGraph = (neighbours: kc.Neighbors) => {
  return cancellable((signal) =>
    kc.graphNeighbours({ client: client(), body: neighbours, signal }),
  );
};

export const getGoalsGraph = (goals: kc.Goals) => {
  return cancellable((signal) => kc.graphGoals({ client: client(), body: goals, signal }));
};

export const setConsole = (console: kc.Console) => {
  return cancellable((signal) => kc.setConsole({ client: client(), body: console, signal }));
};

// Subscribe to console events using the generated client's SSE support.
// Returns a cancel function.
export const consoleEvents = (
  onMessage: (data: string) => void,
  onError: (error: Error) => void,
): (() => void) => {
  const controller = new AbortController();

  const consume = async () => {
    const { stream } = await kc.consoleEvents({
      client: client(),
      signal: controller.signal,
      onSseError: (err) => onError(err instanceof Error ? err : new Error(String(err))),
      sseDefaultRetryDelay: 100,
      sseMaxRetryDelay: 1000,
    });
    for await (const event of stream) {
      onMessage(typeof event === 'string' ? event : JSON.stringify(event));
    }
  };
  consume().catch((err) => {
    if (!controller.signal.aborted) onError(err);
  });

  return () => controller.abort();
};
