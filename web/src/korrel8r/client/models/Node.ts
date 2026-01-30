/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Object } from './Object';
import type { QueryCount } from './QueryCount';
/**
 * Node in the result graph, contains results for a single class.
 */
export type Node = {
  /**
   * Full class name
   */
  class: string;
  /**
   * Queries yielding results for this class.
   */
  queries?: Array<QueryCount>;
  /**
   * Number of results for this class, after de-duplication.
   */
  count?: number;
  /**
   * Serialized result contents, may be large.
   */
  result?: Array<Object>;
};

