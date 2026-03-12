import { K8sGroupVersionKind, K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import { Class, Domain, keyValueList, Query, URIRef } from './types';

// Parsed form of a k8s query selector.
export type Selector = {
  name?: string;
  namespace?: string;
  labels?: { [key: string]: string };
  fields?: { [key: string]: string };
};

const pathRE = new RegExp(
  '(?<prefix>k8s|search|api-resource)' + // prefix
  '/((ns/(?<namespace>[^/]+))|cluster|all-namespaces)' + // /namespace
  '(/(?<resource>[^/]+)(/(?<name>([^/]+))(?<events>/events)?)?)?', // [/resource[/name[/events]]]
);
const versionRE = /(?<version>v[0-9]+((alpha|beta)[0-9]*)?)/;
const classRE = new RegExp(`^(?<kind>[^./]+)(\\.${versionRE.source})?(.(?<group>[^/]*))?$`);

export class K8sDomain extends Domain {
  private classes: { [key: string]: Class }; // Classes by name
  private paths: { [key: string]: K8sModel }; // Models by path component == plural resource name.

  // Constructor takes a map of K8sModel objects, keyed by a Group~Version~Kind string.
  constructor(models: K8sModel[]) {
    super('k8s');
    this.paths = {};
    this.classes = {};
    models.forEach((m) => {
      const name = gvkClass(modelGVK(m));
      this.classes[name] = new Class(this.name, name);
      // Record models by path (plural), prefer core models, otherwise keep first model found.
      if (!this.paths[m.plural] || !m.apiGroup) this.paths[m.plural] = m;
    });
    this.paths.projects = this.paths.namespaces; // Alias
  }

  class(name: string): Class {
    const c = this.classes[name];
    if (!c) throw this.badClass(name);
    return c;
  }

  private classModel(name: string) {
    return this.models[gvkRef(classGVK(name))];
  }
  private modelClass(model: K8sModel) {
    return this.class(gvkClass(modelGVK(model)));
  }

  linkToQuery(link: URIRef): Query {
    const g = link.pathname.match(pathRE)?.groups;
    if (!g) throw this.badLink(link);
    const resource = g.resource || link.searchParams.get('kind');
    const model = this.findResource(resource);
    if (!model?.kind) throw this.badLink(link, `unknown resource: ${resource}`);
    // api-resource is a resource type not a named instance, ignore the name part of the URL.
    const name = g.prefix === 'api-resource' ? undefined : g.name;
    if (g.events) {
      // Special case for /events, query for events with this resource as involved object
      const event = this.eventModel();
      const about = this.eventAboutField(event);
      const apiVersion = `${model.apiGroup ? `${model.apiGroup}/` : ''}${model.apiVersion || 'v1'}`;
      const data = {
        fields: {
          [`${about}.namespace`]: g.namespace,
          [`${about}.name`]: name,
          [`${about}.apiVersion`]: apiVersion,
          [`${about}.kind`]: model.kind,
        },
      };
      return this.modelClass(event).query(JSON.stringify(data));
    } else {
      const data = {
        namespace: g.namespace,
        name,
        labels: K8sDomain.parseSelector(link.searchParams.get('labels')) || undefined,
      };
      return this.modelClass(model).query(JSON.stringify(data));
    }
  }

  // NOTE: k8s queries don't support query constraints, so neither do console k8s URIs.
  queryToLink(query: Query): URIRef {
    let selector: Selector;
    try {
      selector = JSON.parse(query.selector) as Selector;
    } catch (e) {
      throw this.badQuery(query, e.message);
    }
    let model = this.classModel(query.class.name);
    if (!model) throw this.badClass(query.class.toString());
    let namespace = selector.namespace;
    let name = selector.name;
    let events = '';
    if (this.isEvent(model) && selector.fields) {
      // Special case for events, generate URL of involved object with '/events' modifier.
      // Only apply this if fields are present (indicating an event about a specific object).
      const eventClass = this.modelClass(model);
      const about = this.eventAboutField(model);
      const apiVersion = selector.fields[`${about}.apiVersion`];
      const kind = selector.fields[`${about}.kind`];
      // Only treat as an involved object event if the required fields are present
      if (apiVersion && kind) {
        const [group, version] = parseAPIVersion(apiVersion);
        model = this.findGVK(group, version, kind);
        if (!model) throw this.badQuery(query, `no resource matching ${eventClass}.${about}`);
        namespace = selector.fields[`${about}.namespace`] || '';
        name = selector.fields[`${about}.name`] || '';
        events = '/events';
      }
    }
    // Prepare parts of the URL
    const nsPath = namespace ? `ns/${namespace}` : 'all-namespaces';
    const kind = `${model.apiGroup || 'core'}~${model.apiVersion}~${model.kind}`;
    const params = {
      labels: keyValueList(selector.labels) || undefined,
      fields: (!events && keyValueList(selector.fields)) || undefined,
    };
    if (!name && !namespace && (params.labels || params.fields)) {
      // Search URL
      return new URIRef(`search/${nsPath}`, { ...params, kind });
    } else {
      // Specific resource URL
      return new URIRef(`k8s/${nsPath}/${kind}${name ? `/${name}` : ''}${events}`, { ...params });
    }
  }

  // parseSelector parses a selector string as a query map.
  static parseSelector(selector: string): { [key: string]: string } {
    if (!selector) return;
    const labels: { [key: string]: string } = {};
    selector.split(',').forEach((pair: string) => {
      const [key, value] = pair.split(/=(.*)/);
      labels[key] = value;
    });
    return labels || undefined;
  }

  // Original k8s Event resource was in the core group, modern Event is in the events.k8s.io group.
  // Event.v1 has an 'involvedObject' field, Event.v1.events.k8s.io has a 'regarding' field.
  // Need to handle both variations.
  static readonly EVENT = {
    group: 'events.k8s.io',
    version: 'v1',
    kind: 'Event',
  };

  private isEvent(m: K8sModel): boolean {
    const EVENT = K8sDomain.EVENT;
    return (
      m.kind == EVENT.kind &&
      m.apiVersion == EVENT.version &&
      (!m.apiGroup || m.apiGroup === EVENT.group)
    );
  }

  // Returns an event resource model that is supported by the cluster.
  // Prefer the older version as there are still many older clusters out there.
  private eventModel(): K8sModel {
    const EVENT = K8sDomain.EVENT;
    return (
      this.findGVK('', EVENT.version, EVENT.kind) ||
      this.findGVK(EVENT.group, EVENT.version, EVENT.kind)
    );
  }

  private eventAboutField(m: K8sModel): string {
    return m?.apiGroup === K8sDomain.EVENT.group ? 'regarding' : 'involvedObject';
  }

  // Find the cached resource model for a GVK. Same defaulting rules as korrel8r.
  private findGVK(group: string, version: string, kind: string): K8sModel {
    const m = this.models[gvkRef({ group, version, kind })];
    if (m) return m;
    // Some core models are stored under "Kind" only.
    if (!group) return this.models[kind];
  }

  // Return a model for the resource, can be G~V~K or path. Return undefined if not found.
  private findResource(resource: string): K8sModel | undefined {
    const m = this.models?.[resource]; // Match "G~V~K"
    if (m) return m;
    // Some core types stored as just "Kind"
    const kind = resource.match(/^core~v1~([.*])$/)?.[1];
    return (kind && this.models?.[kind]) || this.paths[resource]; // Path is plural
  }
}

const classGVK = (name: string) => name.match(classRE)?.groups as K8sGroupVersionKind;
const modelGVK = (m: K8sModel) => ({
  group: m.apiGroup == 'core' ? '' : m.apiGroup,
  version: m.apiVersion || 'v1',
  kind: m.kind,
});
const gvkRef = ({ group, version, kind }: K8sGroupVersionKind) =>
  [group || 'core', version || 'v1', kind].join('~');
const gvkClass = ({ group, version, kind }: K8sGroupVersionKind) =>
  `${kind}.${version || 'v1'}${group ? '.' + group : ''}`;

const parseAPIVersion = (apiVersion: string): [group: string, version: string] | undefined => {
  const gv = apiVersion?.split('/') || [];
  switch (gv.length) {
    case 1:
      return gv[0].match(versionRE) ? ['', gv[0]] : [gv[0], ''];
    case 2:
      return [gv[0], gv[1]];
    default:
      return ['', ''];
  }
};
