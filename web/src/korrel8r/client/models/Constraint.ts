/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Duration } from './Duration';
/**
 * Constrains the objects that will be included in search results.
 */
export type Constraint = {
  /**
   * Ignore objects with timestamps before this start time.
   */
  start?: string;
  /**
   * Ignore objects with timestamps after this end time.
   */
  end?: string;
  /**
   * Limit total number of objects per query.
   */
  limit?: number;
  /**
   * DEPRECATED store calls are cancelled with the request.
   */
  timeout?: Duration;
};

