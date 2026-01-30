import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
// Mock dependencies before importing the hook
const mockSetConsole = jest.fn();
const mockConsoleUpdates = jest.fn();
jest.mock('../korrel8r-client', () => ({
  setConsole: (...args: unknown[]) => mockSetConsole(...args),
  consoleUpdates: (...args: unknown[]) => mockConsoleUpdates(...args),
}));

const mockLocationQuery = jest.fn();
jest.mock('../hooks/useLocationQuery', () => ({
  useLocationQuery: () => mockLocationQuery(),
}));

const mockNavigateToQuery = jest.fn();
jest.mock('../hooks/useNavigateToQuery', () => ({
  useNavigateToQuery: () => mockNavigateToQuery,
}));

// Import the hook after mocks are set up
import useKorrel8r from '../hooks/useKorrel8r';

// Test component that calls the hook
const TestComponent: React.FC = () => {
  useKorrel8r();
  return null;
};

describe('useKorrel8r', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);

    mockSetConsole.mockImplementation(() => {
      const p = Promise.resolve() as Promise<void> & { cancel: () => void };
      p.cancel = jest.fn();
      return p;
    });
    mockConsoleUpdates.mockReturnValue(jest.fn());
    mockLocationQuery.mockReturnValue(undefined);
  });

  afterEach(() => {
    act(() => {
      ReactDOM.unmountComponentAtNode(container);
    });
    container.remove();
  });

  describe('setConsole effect', () => {
    it('calls setConsole on mount', () => {
      act(() => {
        ReactDOM.render(React.createElement(TestComponent), container);
      });
      expect(mockSetConsole).toHaveBeenCalledWith({ view: '' });
    });

    it('logs error when setConsole rejects', async () => {
      const error = new Error('network error');
      mockSetConsole.mockImplementation(() => {
        const p = Promise.reject(error) as Promise<void> & { cancel: () => void };
        p.cancel = jest.fn();
        return p;
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        ReactDOM.render(React.createElement(TestComponent), container);
      });

      // Wait for the promise rejection to be handled
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      expect(consoleSpy).toHaveBeenCalledWith('korrel8r setConsole: Error: network error');
      consoleSpy.mockRestore();
    });
  });

  describe('consoleUpdates effect', () => {
    it('subscribes to SSE on mount', () => {
      act(() => {
        ReactDOM.render(React.createElement(TestComponent), container);
      });

      expect(mockConsoleUpdates).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
    });

    it('calls cancel on unmount', () => {
      const cancelFn = jest.fn();
      mockConsoleUpdates.mockReturnValue(cancelFn);

      act(() => {
        ReactDOM.render(React.createElement(TestComponent), container);
      });
      act(() => {
        ReactDOM.unmountComponentAtNode(container);
      });

      expect(cancelFn).toHaveBeenCalled();
    });

    it('navigates when update has a view', () => {
      act(() => {
        ReactDOM.render(React.createElement(TestComponent), container);
      });

      const onMessage = mockConsoleUpdates.mock.calls[0][0];
      onMessage(JSON.stringify({ view: 'alert:alert:{severity="critical"}' }));

      expect(mockNavigateToQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          class: expect.objectContaining({ domain: 'alert', name: 'alert' }),
          selector: '{severity="critical"}',
        }),
      );
    });

    it('does not navigate when update has no view', () => {
      act(() => {
        ReactDOM.render(React.createElement(TestComponent), container);
      });

      const onMessage = mockConsoleUpdates.mock.calls[0][0];
      onMessage(JSON.stringify({}));

      expect(mockNavigateToQuery).not.toHaveBeenCalled();
    });

    it('logs SSE errors via onError callback', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        ReactDOM.render(React.createElement(TestComponent), container);
      });

      const onError = mockConsoleUpdates.mock.calls[0][1];
      const error = new Error('connection lost');
      onError(error);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`korrel8r ${error}`));
      consoleSpy.mockRestore();
    });
  });
});
