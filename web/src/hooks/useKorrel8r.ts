import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Console } from 'src/korrel8r/client';
import { consoleUpdates, setConsole } from '../korrel8r-client';
import { Query } from '../korrel8r/types';
import { apiSearch, assignSearch, openTP, Search, setSearch } from '../redux-actions';
import { State } from '../redux-reducers';
import { useLocationQuery } from './useLocationQuery';
import { useNavigateToQuery } from './useNavigateToQuery';

const consoleError = (err: Error | string) => {
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
  const search: Search = useSelector((state: State) => state.plugins?.tp?.get('search'));
  const isOpenTP: Search = useSelector((state: State) => state.plugins?.tp?.get('isOpen'));

  const queryStr = React.useMemo(() => {
    return locationQuery?.toString() ?? '';
  }, [locationQuery]);

  // Call setConsole if queryStr or search changes.
  React.useEffect(() => {
    const set = setConsole({
      view: queryStr,
      search: isOpenTP && search ? apiSearch(search) : undefined,
    });
    set.catch((err) => consoleError(`setConsole: ${err}`));
    return () => set.cancel();
  }, [queryStr, search, isOpenTP]);

  // Create references for navigateToQuery and dispatch to avoid interrupting the event loop.
  const navigateToQueryRef = React.useRef(navigateToQuery);
  React.useEffect(() => {
    navigateToQueryRef.current = navigateToQuery;
  }, [navigateToQuery]);
  const searchRef = React.useRef(search);
  React.useEffect(() => {
    searchRef.current = search;
  }, [search]);

  // Event loop to receive console update events and navigate to the new page.
  React.useEffect(() => {
    const onError = (err: Error) => consoleError(`console events: ${err}`);
    const onMessage = (message: string) => {
      try {
        const event = JSON.parse(message) as Console;
        if (event.view) {
          const query = Query.parse(event.view);
          navigateToQueryRef.current(query); // FIXME what about constraint
        }
        if (event.search) {
          assignSearch(searchRef.current, event.search);
          dispatch(openTP());
          dispatch(setSearch(searchRef.current));
        }
      } catch (err) {
        onError(err);
      }
    };
    return consoleUpdates(onMessage, onError);
  }, [dispatch]);
};

export default useKorrel8r;
