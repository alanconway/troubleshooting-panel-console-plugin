/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Class } from './Class';
import type { Rule } from './Rule';
/**
 * Directed edge in the result graph, from Start to Goal classes.
 */
export type Edge = {
  /**
   * Class name of the start node.
   */
  start: Class;
  /**
   * Class name of the goal node.
   */
  goal: Class;
  /**
   * Set of rules followed along this edge.
   */
  rules?: Array<Rule>;
};

