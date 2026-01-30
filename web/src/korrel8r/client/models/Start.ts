/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Class } from './Class';
import type { Constraint } from './Constraint';
import type { Object } from './Object';
import type { Query } from './Query';
/**
 * Start identifies a set of starting objects for correlation.
 */
export type Start = {
  /**
   * Class of starting objects and queries.
   */
  class?: Class;
  /**
   * Constrain the objects that will be returned.
   */
  constraint?: Constraint;
  /**
   * Start objects serialized as JSON.
   */
  objects?: Array<Object>;
  /**
   * Queries for starting objects
   */
  queries?: Array<Query>;
};

