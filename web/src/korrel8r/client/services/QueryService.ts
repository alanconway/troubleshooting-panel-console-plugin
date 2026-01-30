/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Domain } from '../models/Domain';
import type { Query } from '../models/Query';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class QueryService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * Get the list of correlation domains.
   * Returns a list of Korrel8r domains and the stores configured for each domain.
   *
   * @returns Domain OK
   * @throws ApiError
   */
  public listDomains(): CancelablePromise<Array<Domain>> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/domains',
      errors: {
        400: `invalid parameters`,
        404: `result not found`,
      },
    });
  }
  /**
   * Get the list of classes for a domain.
   * Returns a list of class names for the specified domain.
   *
   * @param domain Name of the domain to list classes for
   * @returns string OK
   * @throws ApiError
   */
  public listDomainClasses(
    domain: string,
  ): CancelablePromise<Array<string>> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/domain/{domain}/classes',
      path: {
        'domain': domain,
      },
      errors: {
        400: `invalid parameters`,
        404: `domain not found`,
      },
    });
  }
  /**
   * Execute a query, returns a list of JSON objects.
   * Execute a single Korrel8r 'query' and return the list of serialized objects found. Does not perform any correlation actions.
   *
   * @param query Query string.
   * @returns any OK
   * @throws ApiError
   */
  public objects(
    query: Query,
  ): CancelablePromise<Array<Record<string, any>>> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/objects',
      query: {
        'query': query,
      },
      errors: {
        400: `invalid parameters`,
        404: `result not found`,
      },
    });
  }
}
