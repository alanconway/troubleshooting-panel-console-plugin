import { Korrel8rNode, NodeError } from './korrel8r.types';
import { parseQuery, parseURL } from './query-url';
import { Constraint } from '../redux-actions';
import { rfc5399ToUnixTimestamp } from '../korrel8r-utils';

enum LogClass {
  application = 'application',
  infrastructure = 'infrastructure',
  audit = 'audit',
}

export class LogNode extends Korrel8rNode {
  logClass: LogClass;
  query: string;
  url: string;

  constructor(url: string, query: string, logClass: LogClass) {
    super();
    this.query = query;
    this.url = url;
    this.logClass = logClass;
  }

  // There are 2 types of URL: pod logs, and log search.
  static fromURL(url: string): Korrel8rNode {
    // First check for aggregated pod logs URL
    const [, namespace, name] = url.match(/k8s\/ns\/([^/]+)\/pods\/([^/]+)\/aggregated-logs/) || [];
    if (namespace && name) {
      const logClass = namespace.match(/^kube|^openshift-/)
        ? LogClass.infrastructure
        : LogClass.application;
      return new LogNode(
        url,
        `log:${logClass}:{kubernetes_namespace_name="${namespace}",` +
          `kubernetes_pod_name="${name}"}`,
        logClass,
      );
    }
    // Search URL
    const [, params] = parseURL('log', 'monitoring/logs', url) || [];
    const logQL = params.get('q');
    const logClassStr =
      params.get('tenant') || logQL?.match(/{[^}]*log_type(?:=~?)"([^"]+)"/)?.at(1);
    const logClass = LogClass[logClassStr as keyof typeof LogClass];
    if (!logClass) throw new NodeError(`No log class found in URL: ${url}`);
    return new LogNode(url, `log:${logClass}:${logQL}`, logClass);
  }

  static fromQuery(query: string, constraint?: Constraint): Korrel8rNode {
    const [clazz, logQL] = parseQuery('log', query);
    const logClass = LogClass[clazz as keyof typeof LogClass];
    if (!logClass) throw new NodeError(`Expected log class in query: ${query}`);
    // Initialize the query URL with the basic information
    let logNodeQuery = `monitoring/logs?q=${encodeURIComponent(logQL)}&tenant=${logClass}`;

    // Append 'start' and 'end' to the query if they are not null
    if (constraint.start) {
      const starttime = rfc5399ToUnixTimestamp(constraint.start);
      logNodeQuery += `&start=${encodeURIComponent(starttime * 1000)}`;
    }
    if (constraint.end) {
      const endtime = rfc5399ToUnixTimestamp(constraint.end);
      logNodeQuery += `&end=${encodeURIComponent(endtime * 1000)}`;
    }
    // Return the LogNode with the modified query
    return new LogNode(logNodeQuery, query, logClass);
  }

  toURL(): string {
    return this.url;
  }

  toQuery(): string {
    return this.query;
  }
}
