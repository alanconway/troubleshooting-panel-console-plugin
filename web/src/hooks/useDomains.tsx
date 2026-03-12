import { K8sModel } from '@openshift-console/dynamic-plugin-sdk';
import * as React from 'react';
import { useSelector } from 'react-redux';
import { AlertDomain } from '../korrel8r/alert';
import { K8sDomain } from '../korrel8r/k8s';
import { LogDomain } from '../korrel8r/log';
import { MetricDomain } from '../korrel8r/metric';
import { NetflowDomain } from '../korrel8r/netflow';
import { TraceDomain } from '../korrel8r/trace';
import { Domains } from '../korrel8r/types';
import { State } from '../redux-reducers';

const API_DISCOVERY_RESOURCES_LOCAL_STORAGE_KEY = 'bridge/api-discovery-resources';

// Some domains are dependent on hook state, so we need a hook for domains
export const useDomains = () => {
  const alertRules = useSelector(
    (state: State) => state?.plugins?.mp?.alerting?.cmo?.['#ALL_NS#']?.rules,
  );

  const alertIDs = React.useMemo(() => {
    if (!alertRules) return new Map<string, string>();
    return new Map<string, string>(alertRules.map(({ id, name }) => [id, name]));
  }, [alertRules]);

  // Only parse models when resourcesJSON changes
  const resourcesJSON = localStorage.getItem(API_DISCOVERY_RESOURCES_LOCAL_STORAGE_KEY);
  const models = React.useMemo<{ [key: string]: K8sModel }>(() => {
    if (!resourcesJSON) return;
    const resources = JSON.parse(resourcesJSON);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowWithFlags = window as any;
    const { consoleVersion: currentVersion } = windowWithFlags.SERVER_FLAGS;
    const { consoleVersion: cachedVersion } = resources;
    return (cachedVersion === currentVersion) ? resources.models : {};
  }, [resourcesJSON]);

  const domains = React.useMemo(
    () => {
      console.debug("FIXME korrel8r models", JSON.stringify(models))
      return new Domains(
        new AlertDomain(alertIDs),
        new K8sDomain(models),
        new LogDomain(),
        new MetricDomain(),
        new NetflowDomain(),
        new TraceDomain(),
      )
    },
    [alertIDs, models],
  );

  return domains;
};
