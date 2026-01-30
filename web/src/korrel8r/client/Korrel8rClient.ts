/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { BaseHttpRequest } from './core/BaseHttpRequest';
import type { OpenAPIConfig } from './core/OpenAPI';
import { FetchHttpRequest } from './core/FetchHttpRequest';
import { ConfigureService } from './services/ConfigureService';
import { ConsoleService } from './services/ConsoleService';
import { CorrelateService } from './services/CorrelateService';
import { QueryService } from './services/QueryService';
type HttpRequestConstructor = new (config: OpenAPIConfig) => BaseHttpRequest;
export class Korrel8rClient {
  public readonly configure: ConfigureService;
  public readonly console: ConsoleService;
  public readonly correlate: CorrelateService;
  public readonly query: QueryService;
  public readonly request: BaseHttpRequest;
  constructor(config?: Partial<OpenAPIConfig>, HttpRequest: HttpRequestConstructor = FetchHttpRequest) {
    this.request = new HttpRequest({
      BASE: config?.BASE ?? '/api/v1alpha1',
      VERSION: config?.VERSION ?? '1alpha1',
      WITH_CREDENTIALS: config?.WITH_CREDENTIALS ?? false,
      CREDENTIALS: config?.CREDENTIALS ?? 'include',
      TOKEN: config?.TOKEN,
      USERNAME: config?.USERNAME,
      PASSWORD: config?.PASSWORD,
      HEADERS: config?.HEADERS,
      ENCODE_PATH: config?.ENCODE_PATH,
    });
    this.configure = new ConfigureService(this.request);
    this.console = new ConsoleService(this.request);
    this.correlate = new CorrelateService(this.request);
    this.query = new QueryService(this.request);
  }
}

