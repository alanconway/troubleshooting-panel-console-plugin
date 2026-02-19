import { action, ActionType as Action } from 'typesafe-actions';
import { Search as APISearch } from './korrel8r/client';
import { Constraint, Graph } from './korrel8r/types';
import { DAY, Duration, Period } from './time';

export enum ActionType {
  CloseTroubleshootingPanel = 'closeTroubleshootingPanel',
  OpenTroubleshootingPanel = 'openTroubleshootingPanel',
  SetSearch = 'setSearch',
  SetResult = 'setResult',
}

export enum SearchType {
  Distance = 'distance',
  Goal = 'goal',
}

// Search parameters from panel widgets for korrel8r request.
export type Search = {
  queryStr?: string;
  type?: SearchType;
  depth?: number;
  goal?: string;
  constraint?: Constraint;
  period?: Period; // Constraint is updated from period on each call.
};

// Result displayed in troubleshooting panel, graph or error.
export type Result = {
  graph?: Graph;
  message?: string;
  title?: string;
  isError?: boolean;
};

// Default search parameters do a neighbourhood search of depth 3.
export const defaultSearch = {
  type: SearchType.Distance,
  depth: 3,
  period: new Duration(1, DAY),
};

export const closeTP = () => action(ActionType.CloseTroubleshootingPanel);
export const openTP = () => action(ActionType.OpenTroubleshootingPanel);
export const setSearch = (search: Search) => action(ActionType.SetSearch, search);
export const setResult = (result: Result | null) => action(ActionType.SetResult, result);

export const actions = {
  closeTP,
  openTP,
  setSearch,
  setResult,
};

export type TPAction = Action<typeof actions>;

/** Convert an API Search (from SSE messages) to a redux Search for the panel. */
export function apiToReduxSearch(apiSearch: APISearch): Search {
  if (apiSearch.neighbors) {
    const { start, depth } = apiSearch.neighbors;
    return {
      type: SearchType.Distance,
      depth,
      queryStr: start?.queries?.[0],
      constraint: start?.constraint ? Constraint.fromAPI(start.constraint) : undefined,
    };
  }
  if (apiSearch.goals) {
    const { start, goals } = apiSearch.goals;
    return {
      type: SearchType.Goal,
      goal: goals?.[0],
      queryStr: start?.queries?.[0],
      constraint: start?.constraint ? Constraint.fromAPI(start.constraint) : undefined,
    };
  }
  return {};
}
