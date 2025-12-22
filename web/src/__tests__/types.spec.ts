import * as api from '../korrel8r/client';

import {
  Class,
  Constraint,
  Domain,
  Domains,
  Edge,
  Graph,
  Node,
  Query,
  QueryCount,
  URIRef,
  joinPath,
} from '../korrel8r/types';

describe('Query', () => {
  it('converts to/from string', () => {
    const abc = new Class('a', 'b').query('c=d');
    expect(abc.toString()).toEqual('a:b:c=d');
    expect(Query.parse('a:b:c=d')).toEqual(abc);
    expect(() => Query.parse('x')).toThrow(/invalid.*: x/);
  });
});

class FakeDomain extends Domain {
  constructor(name: string) {
    super(name);
  }

  class(name: string): Class | undefined {
    return new Class(this.name, name);
  }

  linkToQuery(link: URIRef): Query {
    const m = link?.pathname?.match(new RegExp(`/?${this.name}/([^/]+)`));
    if (!m) throw this.badLink(link);
    return new Class(this.name, m[1]).query(link.searchParams.toString());
  }

  queryToLink(query: Query, constraint?: Constraint): URIRef {
    if (!query || !query.class || query.class.domain != this.name) throw this.badQuery(query);
    return new URIRef(`${query.class.domain}/${query.class.name}?${query.selector}`, {
      constraint: constraint,
    });
  }
}

const start = new Date(1969, 2, 21);
const end = new Date();

describe('Constraint', () => {
  it.each([
    { clientC: {}, typesC: {} },
    { clientC: { start: start.toISOString(), end: end.toISOString() }, typesC: { start, end } },
    { clientC: { limit: 50, timeout: '1111111111' }, typesC: { limit: 50, timeoutNS: 1111111111 } },
  ] as Array<{ clientC: api.Constraint; typesC: Partial<Constraint> }>)(
    'from/toAPI %s',
    ({ clientC, typesC }) => {
      const c = new Constraint(typesC);
      expect(Constraint.fromAPI(clientC)).toEqual(c);
      expect(c.toAPI()).toEqual(clientC); // Round trip.
    },
  );
});

describe('Domain', () => {
  const d = new FakeDomain('a');
  const abc = d.class('b').query('c=d');
  it('queryToLink', () => {
    expect(d.queryToLink(abc).toString()).toEqual('a/b?c=d');
    const query = Query.parse('x:b:c');
    expect(() => d.queryToLink(query)).toThrow('invalid query for domain a: x:b:c');
  });
  it('linkToQuery', () => {
    expect(d.linkToQuery(new URIRef('a/b?c=d'))).toEqual(abc);
    expect(d.linkToQuery(new URIRef('/a/b?c=d'))).toEqual(abc);
    expect(d.linkToQuery(new URIRef('http://blah/a/b?c=d'))).toEqual(abc);
  });
});

describe('Domains', () => {
  const ds = new Domains(...['a', 'x'].map((name: string): Domain => new FakeDomain(name)));
  const abc = Query.parse('a:b:c=d');
  const xyz = Query.parse('x:y:z=z');
  it('queryToLink', () => {
    expect(ds.queryToLink(abc).toString()).toEqual('a/b?c=d');
    expect(ds.queryToLink(xyz).toString()).toEqual('x/y?z=z');
    expect(() => ds.queryToLink(Query.parse('z:b:c'))).toThrow(/unknown domain .*: z:b:c/);
  });
  it('linkToQuery', () => {
    expect(ds.linkToQuery(new URIRef('x/y?z=z'))).toEqual(xyz);
    expect(ds.linkToQuery(new URIRef('http://blah/a/b?c=d'))).toEqual(abc);
  });
});

describe('URIRef', () => {
  it('constructor', () => {
    const u = new URIRef('/a/b?c=d&x=y#z');
    expect(u.pathname).toEqual('/a/b');
    expect(Object.fromEntries(u.searchParams.entries())).toEqual({ c: 'd', x: 'y' });
    expect(u.hash).toEqual('#z');
  });

  it('constructor with moreParams', () => {
    const u = new URIRef('/a/b?c=d&x=y', { c: 'dd', q: 'foo' });
    expect(u.pathname).toEqual('/a/b');
    expect(Object.fromEntries(u.searchParams.entries())).toEqual({ c: 'dd', x: 'y', q: 'foo' });
  });

  it.each(['', '/a/b?c=d&x=y#z', '/path', 'relpath', '/k8s/ns/netobserv/core~v1~Pod'])(
    'round trip: %s',
    (str) => {
      expect(new URIRef(str).toString()).toEqual(str);
    },
  );

  it.each([
    ['a/b?c=d&x=y#z', 'http://example/x/', 'http://example/x/a/b?c=d&x=y#z'], // Relative
    ['/a/b?c=d&x=y#z', 'http://example/x/', 'http://example/a/b?c=d&x=y#z'], // Absolute
  ])('resolve to URL: %s', (ref, base, want) => {
    expect(new URIRef(ref).resolve(base).toString()).toEqual(want);
  });
});

describe('Node', () => {
  it('constructor', () => {
    expect(
      new Node({
        class: 'a:b',
        count: 10,
        queries: [
          { query: 'a:b:c', count: 5 },
          { query: 'a:b:d', count: 5 },
        ],
      }),
    ).toEqual({
      id: 'a:b',
      count: 10,
      class: { domain: 'a', name: 'b' },
      queries: [
        {
          query: { class: { domain: 'a', name: 'b' }, selector: 'c' },
          count: 5,
        },
        {
          query: { class: { domain: 'a', name: 'b' }, selector: 'd' },
          count: 5,
        },
      ],
    });
  });

  it('constructor bad class', () => {
    expect(new Node({ class: 'foobar', count: 1 })).toEqual({
      id: 'foobar',
      count: 1,
      error: new TypeError('invalid class: foobar'),
      queries: [],
    });
  });
});

describe('Graph', () => {
  const a: api.Graph = {
    nodes: [
      { class: 'a:x', count: 1, queries: [{ query: 'a:x:one', count: 1 }] },
      { class: 'b:y', count: 2, queries: [{ query: 'b:y:two', count: 2 }] },
      {
        class: 'c:z',
        count: 4,
        queries: [
          { query: 'c:z:one', count: 1 },
          { query: 'c:z:three', count: 3 },
        ],
      },
    ],
    edges: [
      { start: 'a:x', goal: 'b:y' },
      { start: 'a:x', goal: 'c:z' },
      { start: 'b:y', goal: 'c:z' },
    ],
  };
  const g = new Graph(a);
  g.nodes.forEach((n) => expect(g.node(n.id)).toEqual(n)); // Lookup nodes
  expect(g.nodes).toEqual(a.nodes.map((n) => new Node(n)));
  expect(g.edges).toEqual(a.edges.map((e) => new Edge(g.node(e.start), g.node(e.goal))));

  describe('findRule', () => {
    const graph = new Graph({
      nodes: [
        { class: 'k8s:Pod.v1', count: 3, queries: [] },
        { class: 'log:application', count: 5, queries: [] },
        { class: 'metric:metric', count: 2, queries: [] },
      ],
      edges: [
        {
          start: 'k8s:Pod.v1',
          goal: 'log:application',
          rules: [
            {
              name: 'PodToLog',
              queries: [
                { query: 'log:application:{name=test-pod}', count: 3 },
                { query: 'log:application:{namespace=default}', count: 1 },
              ],
            },
          ],
        },
        {
          start: 'k8s:Pod.v1',
          goal: 'metric:metric',
          rules: [
            {
              name: 'PodToMetric',
              queries: [{ query: 'metric:metric:instance=pod1', count: 2 }],
            },
            {
              name: 'AlternativeRule',
              queries: [{ query: 'metric:metric:job=monitoring', count: 1 }],
            },
          ],
        },
      ],
    });

    it('finds valid rules', () => {
      let qc: QueryCount
      qc = new QueryCount({ query: 'log:application:{name=test-pod}', count: 3 })
      expect(graph.findRule(qc).name).toEqual("PodToLog")
      qc = new QueryCount({ query: 'metric:metric:instance=pod1', count: 2 })
      expect(graph.findRule(qc).name).toEqual("PodToMetric")
    });

    it('returns undefined for QueryCount with an unknown query', () => {
      const rule = graph.findRule(new QueryCount({ query: 'k8s:Pod.v1:nosuchquery', count: 1 }))
      expect(rule).toBeUndefined();
    });

    it('returns undefined for QueryCount with non-existent goal class', () => {
      const rule = graph.findRule(new QueryCount({ query: 'nosuch:classatall:nosuchquery', count: 1 }))
      expect(rule).toBeUndefined();
    });

    it('returns undefined when edge exists but has no rules', () => {
      const graphWithNoRules: api.Graph = {
        nodes: [
          { class: 'source:type', count: 1, queries: [] },
          { class: 'target:type', count: 1, queries: [] },
        ],
        edges: [
          { start: 'source:type', goal: 'target:type' }, // No rules
        ],
      };
      const gNoRules = new Graph(graphWithNoRules);
      const queryCount = new QueryCount({
        query: 'target:type:selector=value',
        count: 1,
      });

      const foundRule = gNoRules.findRule(queryCount);
      expect(foundRule).toBeUndefined();
    });

    it('returns undefined for empty graph', () => {
      const emptyGraph = new Graph({ nodes: [], edges: [] });
      const queryCount = new QueryCount({
        query: 'any:class:selector=value',
        count: 1,
      });

      const foundRule = emptyGraph.findRule(queryCount);
      expect(foundRule).toBeUndefined();
    });
  });
});

describe('QueryCount', () => {
  describe('equals', () => {
    it('returns true for identical QueryCount instances', () => {
      const qc1 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });
      const qc2 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });

      expect(qc1.equals(qc2)).toBe(true);
      expect(qc2.equals(qc1)).toBe(true); // Symmetric
    });

    it('returns true for same instance', () => {
      const qc = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });
      expect(qc.equals(qc)).toBe(true);
    });

    it('returns false for different counts', () => {
      const qc1 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });
      const qc2 = new QueryCount({ query: 'k8s:pod:name=test', count: 10 });

      expect(qc1.equals(qc2)).toBe(false);
      expect(qc2.equals(qc1)).toBe(false);
    });

    it('returns false for different queries', () => {
      const qc1 = new QueryCount({ query: 'k8s:pod:name=test1', count: 5 });
      const qc2 = new QueryCount({ query: 'k8s:pod:name=test2', count: 5 });

      expect(qc1.equals(qc2)).toBe(false);
      expect(qc2.equals(qc1)).toBe(false);
    });

    it('returns false for different domains', () => {
      const qc1 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });
      const qc2 = new QueryCount({ query: 'logs:pod:name=test', count: 5 });

      expect(qc1.equals(qc2)).toBe(false);
      expect(qc2.equals(qc1)).toBe(false);
    });

    it('handles QueryCounts with errors correctly', () => {
      const qc1 = new QueryCount({ query: 'malformed-query', count: 1 });
      const qc2 = new QueryCount({ query: 'malformed-query', count: 1 });

      // Both should have errors due to malformed query
      expect(qc1.error).toBeDefined();
      expect(qc2.error).toBeDefined();

      expect(qc1.equals(qc2)).toBe(true);
    });

    it('returns false when one has error and other does not', () => {
      const qc1 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });
      const qc2 = new QueryCount({ query: 'malformed-query', count: 5 });

      expect(qc1.error).toBeUndefined();
      expect(qc2.error).toBeDefined();

      expect(qc1.equals(qc2)).toBe(false);
      expect(qc2.equals(qc1)).toBe(false);
    });

    it('returns false for different error types', () => {
      // Create QueryCounts that will have different errors
      const qc1 = new QueryCount({ query: 'invalid-format', count: 1 });
      const qc2 = new QueryCount({ query: 'also:invalid', count: 1 });

      expect(qc1.error).toBeDefined();
      expect(qc2.error).toBeDefined();

      // Both have errors but they should be different
      expect(qc1.equals(qc2)).toBe(false);
    });

    it('handles edge cases with null values', () => {
      const qc1 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });

      // Test comparison with null/undefined - this will likely throw
      // since the method tries to access properties on null/undefined
      expect(() => {
        qc1.equals(null as QueryCount);
      }).toThrow();

      expect(() => {
        qc1.equals(undefined as QueryCount);
      }).toThrow();
    });

    it('compares query string representations correctly', () => {
      // Even if internal Query objects are different instances,
      // they should be equal if their string representations match
      const qc1 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });
      const qc2 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });

      // Ensure they have different Query object instances but same string
      expect(qc1.query).not.toBe(qc2.query); // Different instances
      expect(qc1.query.toString()).toEqual(qc2.query.toString()); // Same string

      expect(qc1.equals(qc2)).toBe(true);
    });

    it('is case sensitive for query comparison', () => {
      const qc1 = new QueryCount({ query: 'k8s:pod:name=Test', count: 5 });
      const qc2 = new QueryCount({ query: 'k8s:pod:name=test', count: 5 });

      expect(qc1.equals(qc2)).toBe(false);
    });

    it('handles complex queries correctly', () => {
      const complexQuery = 'k8s:pod:namespace=default,name=test-pod,ready=true';
      const qc1 = new QueryCount({ query: complexQuery, count: 10 });
      const qc2 = new QueryCount({ query: complexQuery, count: 10 });

      expect(qc1.equals(qc2)).toBe(true);
    });

    it('returns false for slight query differences', () => {
      const qc1 = new QueryCount({
        query: 'k8s:pod:namespace=default,name=test',
        count: 5,
      });
      const qc2 = new QueryCount({
        query: 'k8s:pod:namespace=default,name=test2',
        count: 5,
      });

      expect(qc1.equals(qc2)).toBe(false);
    });
  });
});

describe('joinPath', () => {
  it.each([
    // Basic path joining
    ['path1', 'path2', 'path1/path2'],
    ['path1', 'path2', 'path3', 'path1/path2/path3'],

    // Handling trailing slash on first path
    ['path1/', 'path2', 'path1/path2'],
    ['path1//', 'path2', 'path1/path2'],

    // Handling leading slashes on subsequent paths
    ['path1', '/path2', 'path1/path2'],
    ['path1', '//path2', 'path1/path2'],

    // Handling trailing slashes on subsequent paths
    ['path1', 'path2/', 'path1/path2'],
    ['path1', 'path2//', 'path1/path2'],

    // Complex combinations
    ['path1/', '/path2/', '/path3/', 'path1/path2/path3'],
    ['/path1/', '//path2//', '///path3///', '/path1/path2/path3'],

    // Empty paths
    ['', 'path2', '/path2'],
    ['path1', '', 'path1/'],
    ['', '', '/'],

    // Single path
    ['single', 'single'],
    ['single/', 'single'],
    ['/single/', '/single'],

    // Absolute paths
    ['/absolute', 'relative', '/absolute/relative'],
    ['/absolute/', '/relative/', '/absolute/relative'],
  ] as Array<string[]>)('joins paths correctly: %s', (...args: string[]) => {
    const expected = args.pop() as string;
    const paths = args as string[];
    const [first, ...rest] = paths;
    expect(joinPath(first, ...rest)).toEqual(expected);
  });
});
