/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Goals } from '../models/Goals';
import type { Graph } from '../models/Graph';
import type { Neighbors } from '../models/Neighbors';
import type { Node } from '../models/Node';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class CorrelateService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * Create a correlation graph from start objects to goal queries.
   * Specify a set of start objects, as queries or serialized objects, and a goal class. Returns a graph containing all paths leading from a start object to a goal object.
   *
   * @param requestBody Search from start to goal classes.
   * @param options Options controlling the form of the returned graph.
   * @returns Graph OK
   * @throws ApiError
   */
  public graphGoals(
    requestBody: Goals,
    options?: {
      /**
       * If true include rule names in graph edges.
       */
      rules?: boolean;
      /**
       * If true include full JSON results with each Query.
       */
      results?: boolean;
      /**
       * if true include non-fatal error messages.
       */
      errors?: boolean;
    },
  ): CancelablePromise<Graph> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/graphs/goals',
      query: {
        'options': options,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `invalid parameters`,
        404: `result not found`,
      },
    });
  }
  /**
   * Create a neighborhood graph around a start object to a given depth.
   * Specify a set of start objects, as queries or serialized objects, and a depth for the neighborhood search. Returns a graph of all paths with depth or less edges leading from start objects.
   *
   * @param requestBody Search from start for neighbors.
   * @param options Options controlling the form of the returned graph.
   * @returns Graph OK
   * @throws ApiError
   */
  public graphNeighbors(
    requestBody: Neighbors,
    options?: {
      /**
       * If true include rule names in graph edges.
       */
      rules?: boolean;
      /**
       * If true include full JSON results with each Query.
       */
      results?: boolean;
      /**
       * if true include non-fatal error messages.
       */
      errors?: boolean;
    },
  ): CancelablePromise<Graph> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/graphs/neighbors',
      query: {
        'options': options,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `invalid parameters`,
        404: `result not found`,
      },
    });
  }
  /**
   * Create a neighborhood graph around a start object to a given depth.
   * Specify a set of start objects, as queries or serialized objects, and a depth for the neighborhood search. Returns a graph of all paths with depth or less edges leading from start objects.
   *
   * @param requestBody Search from start for neighbors.
   * @param options Options controlling the form of the returned graph.
   * @returns Graph OK
   * @throws ApiError
   */
  public graphNeighbours(
    requestBody: Neighbors,
    options?: {
      /**
       * If true include rule names in graph edges.
       */
      rules?: boolean;
      /**
       * If true include full JSON results with each Query.
       */
      results?: boolean;
      /**
       * if true include non-fatal error messages.
       */
      errors?: boolean;
    },
  ): CancelablePromise<Graph> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/graphs/neighbours',
      query: {
        'options': options,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `invalid parameters`,
        404: `result not found`,
      },
    });
  }
  /**
   * Create a list of goal nodes related to a starting point.
   * Specify a set of start objects, as queries or serialized objects, and a goal class. Returns a list of all objects of the goal class that can be reached from a start object.
   *
   * @param requestBody search from start to goal classes
   * @returns Node OK
   * @throws ApiError
   */
  public listGoals(
    requestBody: Goals,
  ): CancelablePromise<Array<Node>> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/lists/goals',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `invalid parameters`,
        404: `result not found`,
      },
    });
  }
}
