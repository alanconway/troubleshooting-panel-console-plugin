/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ConfigureService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * Change configuration settings at runtime.
   * Modify selected configuration settings (e.g. log verbosity) on a running service.
   *
   * @param verbose Verbose level for logging.
   * @returns any OK
   * @throws ApiError
   */
  public setConfig(
    verbose?: number,
  ): CancelablePromise<any> {
    return this.httpRequest.request({
      method: 'PUT',
      url: '/config',
      query: {
        'verbose': verbose,
      },
    });
  }
}
