/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Query } from './Query';
/**
 * Query with number of results.
 */
export type QueryCount = {
  /**
   * Number of results, omitted if the query was not executed.
   */
  count?: number;
  /**
   * Query for correlation data.
   */
  query: Query;
};

