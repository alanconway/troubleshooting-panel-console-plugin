/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Goals } from './Goals';
import type { Neighbors } from './Neighbors';
/**
 * Search parameters for the correlation search displayed in the console troubleshooting panel. Exactly one of goals, neighbors should be set.
 */
export type Search = {
  goals?: Goals;
  neighbors?: Neighbors;
};

