/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Console } from '../models/Console';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class ConsoleService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * Make console state available to an agent.
   * Put the current state of the console so it can be retrieved by an agent via the MCP API.
   *
   * @param requestBody Parameters for the updated console display.
   * @returns any Console display updated successfully
   * @throws ApiError
   */
  public setConsole(
    requestBody: Console,
  ): CancelablePromise<any> {
    return this.httpRequest.request({
      method: 'PUT',
      url: '/console',
      body: requestBody,
      mediaType: 'text/json',
      errors: {
        400: `invalid parameters`,
      },
    });
  }
  /**
   * Updates for the console display from an agent.
   * Use SSE (server-sent events) to send updates for the console display. The updates come from an agent using the MCP API.
   *
   * @returns any Stream of console display updates.
   * @throws ApiError
   */
  public consoleUpdates(): CancelablePromise<any> {
    return this.httpRequest.request({
      method: 'GET',
      url: '/console/updates',
    });
  }
}
