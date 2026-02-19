import * as React from 'react';
import { useDispatch } from 'react-redux';
import { Console } from 'src/korrel8r/client';
import { consoleUpdates, setConsole } from '../korrel8r-client';
import { Query } from '../korrel8r/types';
import { apiToReduxSearch, setSearch } from '../redux-actions';
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
  const dispatch = useDispatch();

  // Create references for navigateToQuery and dispatch to avoid interrupting the event loop.
  const navigateToQueryRef = React.useRef(navigateToQuery);
  React.useEffect(() => { navigateToQueryRef.current = navigateToQuery; }, [navigateToQuery]);
  const dispatchRef = React.useRef(dispatch);
  React.useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);

  // Memoize queryStr, call setConsole on changes.
  const queryStr = React.useMemo(() => {
    return locationQuery?.toString() ?? '';
  }, [locationQuery]);

  React.useEffect(() => {
    const set = setConsole({ view: queryStr });
    set.catch((err) => onError(`setConsole: ${err}`));
    return () => set.cancel();
  }, [queryStr]);


  // Event loop to receive console update events and navigate to the new page.
  React.useEffect(() => {
    const onMessage = (message: string) => {
      try {
        const update = JSON.parse(message) as Console;
        if (update.view) {
          const query = Query.parse(update.view);
          navigateToQueryRef.current(query); // FIXME what about constraint
        }
        if (update.search) {
          dispatchRef.current(setSearch(apiToReduxSearch(update.search)));
        }
      } catch (err) {
        onError(`console event: ${err}`);
      }
    };
    return consoleUpdates(onMessage, onError);
  }, []); // No dependencies, use refs
};

export default useKorrel8r;
