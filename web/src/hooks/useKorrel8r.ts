import * as React from 'react';
import { Console } from 'src/korrel8r/client';
import { consoleUpdates, setConsole } from '../korrel8r-client';
import { Query } from '../korrel8r/types';
import { useLocationQuery } from './useLocationQuery';
import { useNavigateToQuery } from './useNavigateToQuery';

const onError = (err: Error | string) => {
  // eslint-disable-next-line no-console
  console.error(`korrel8r ${err}`);
};

// This hook sets up two-way communication with an AI agent, using Korrel8r as a bridge.
// - Changes to the console view are posed to korrel8r, where the agent can retrieve them.
// - This hook listens for events indicating the agent wants to change the console view.
const useKorrel8r = () => {
  const locationQuery = useLocationQuery();
  const navigateToQuery = useNavigateToQuery();

  const queryStr = React.useMemo(() => {
    return locationQuery?.toString() ?? '';
  }, [locationQuery]);

  React.useEffect(() => {
    const set = setConsole({ view: queryStr });
    set.catch((err) => onError(`setConsole: ${err}`));
    return () => set.cancel();
  }, [queryStr]);

  // Create a stable reference to navigateToQuery so that the event receiving
  // effect isn't cancelled when useNavigateToQuery changes.
  const navigateToQueryRef = React.useRef(navigateToQuery);
  React.useEffect(() => {
    navigateToQueryRef.current = navigateToQuery;
  }, [navigateToQuery]);

  // Listen for console update events and navigate to the new page.
  React.useEffect(() => {
    const onMessage = (message: string) => {
      try {
        const update = JSON.parse(message) as Console;
        if (update.view) {
          const query = Query.parse(update.view);
          navigateToQueryRef.current(query); // FIXME what about constraint
        }
        if (update.search) {
          onError(`FIXME search, not executed: ${update.search}`);
        }
      } catch (err) {
        onError(`console event: ${err}`);
      }
    };
    return consoleUpdates(onMessage, onError);
  }, []); // No dependencies, use navigateToQuery by reference
};

export default useKorrel8r;
