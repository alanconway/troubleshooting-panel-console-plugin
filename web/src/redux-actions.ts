import { action, ActionType as Action } from 'typesafe-actions';
import * as api from './korrel8r/client';
import { Constraint, Graph } from './korrel8r/types';
import { DAY, Duration, Period, periodFor } from './time';

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

/** Merge an API Search into a redux search. */
export const assignSearch = (search: Search, apiSearch: api.Search) => {
  if (!apiSearch?.neighbors && !apiSearch?.goals) return;
  const { start } = apiSearch.goals || apiSearch.neighbors;
  const constraint = start?.constraint && Constraint.fromAPI(start.constraint);
  const period =
    constraint?.start && constraint?.end && periodFor(constraint?.start, constraint?.end);
  const update = {
    type: apiSearch.goals ? SearchType.Goal : SearchType.Distance,
    queryStr: start?.queries?.[0],
    constraint: constraint,
    period,
    depth: apiSearch?.neighbors?.depth,
    goals: apiSearch?.goals?.goals?.[0],
  };
  Object.assign(search, update);
};

/** Convert redux Search to an API Search. */
export const apiSearch = (search: Search): api.Search => {
  if (!search || !search.type) return {};
  const queryStr = search.queryStr?.trim();
  // Update constraint from period
  if (search.period && search.constraint) {
    [search.constraint.start, search.constraint.end] = search.period.startEnd();
  }
  const start: api.Start = {
    queries: queryStr && [queryStr],
    constraint: search.constraint?.toAPI(),
  };
  switch (search.type) {
    case SearchType.Goal:
      return { goals: { start, goals: search.goal && [search.goal] } };
    case SearchType.Distance:
      return { neighbors: { start, depth: search.depth } };
  }
};
