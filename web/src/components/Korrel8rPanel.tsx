import {
  Button,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  ExpandableSection,
  ExpandableSectionToggle,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Spinner,
  TextArea,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { CubesIcon, ExclamationCircleIcon, SyncIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { TFunction, Trans, useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useDomains } from '../hooks/useDomains';
import { useLocationQuery } from '../hooks/useLocationQuery';
import { usePluginAvailable } from '../hooks/usePluginAvailable';
import { getGoalsGraph, getNeighborsGraph } from '../korrel8r-client';
import * as api from '../korrel8r/client';
import * as korrel8r from '../korrel8r/types';
import { apiSearch, defaultSearch, Result, Search, setResult, setSearch } from '../redux-actions';
import { State } from '../redux-reducers';
import * as time from '../time';
import { HelpPopover as FieldLevelHelp } from './HelpPopover';
import './korrel8rpanel.css';
import { SearchFormGroup } from './SearchFormGroup';
import TimeRangeFormGroup from './TimeRangeFormGroup';
import { Korrel8rTopology } from './topology/Korrel8rTopology';

export default function Korrel8rPanel() {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  const dispatch = useDispatch();

  const search: Search = useSelector((state: State) => state.plugins?.tp?.get('search'));
  const result: Result | null = useSelector((state: State) => state.plugins?.tp?.get('result'));

  const domains = useDomains();
  const locationQuery = useLocationQuery();

  // Showing advanced query
  const [showQuery, setShowQuery] = React.useState(false);

  // On mount: if no stored search, set initial search from locationQuery.
  React.useEffect(() => {
    if (!search?.queryStr && locationQuery) {
      dispatch(setSearch({ ...defaultSearch, queryStr: locationQuery.toString() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // No dependencies, run on mount only.

  // Execute the search asynchronously
  React.useEffect(() => {
    let cancelled: boolean;
    const params = apiSearch(search);
    let fetch: api.CancelablePromise<api.Graph>;
    if (params?.goals) fetch = getGoalsGraph(params.goals);
    else if (params?.neighbors) fetch = getNeighborsGraph(params.neighbors);
    else {
      dispatch(setResult({ message: t('Missing parameters') })); // Empty result
      return;
    }
    fetch
      .then((response: api.Graph) => {
        dispatch(setResult({ graph: new korrel8r.Graph(response) }));
      })
      .catch((err: Error & api.ApiError) => {
        if (cancelled) return;
        const message = err?.body?.error || err?.message || t('unknown error');
        dispatch(setResult({ message: message }));
      });
    return () => {
      cancelled = true;
      fetch.cancel();
    };
  }, [search, t, dispatch]);

  const queryToggleID = 'query-toggle';
  const queryContentID = 'query-content';
  const queryInputID = 'query-input';

  const queryHelp = (
    <>
      <Title headingLevel="h4">
        {t('Query')}
        <FieldLevelHelp header={t('Query')}>
          <p>
            <Trans t={t}>
              Selects the starting point for correlation search. This query is set automatically by
              the <code>Focus</code> button. You can edit it manually to specify a custom query.
            </Trans>
          </p>
        </FieldLevelHelp>
      </Title>
    </>
  );

  const focusButton = (
    <Tooltip
      content={
        locationQuery
          ? t('Create a graph of items correlated from resources in the current page.')
          : t('The current page does not support correlation.')
      }
    >
      <Button
        isAriaDisabled={!locationQuery}
        onClick={() => {
          dispatch(
            setSearch({
              ...search,
              queryStr: locationQuery?.toString(),
            }),
          );
        }}
      >
        {t('Focus')}
      </Button>
    </Tooltip>
  );

  const advancedToggle = (
    <ExpandableSectionToggle
      contentId={queryContentID}
      toggleId={queryToggleID}
      isExpanded={showQuery}
      onToggle={(on: boolean) => {
        setShowQuery(on);
      }}
    >
      {t('Advanced')}
    </ExpandableSectionToggle>
  );

  const refreshButton = (
    <Tooltip content={t('Refresh the graph using the current settings')}>
      <Button
        isAriaDisabled={!search?.queryStr}
        onClick={() => {
          dispatch(setSearch(search));
        }}
      >
        <SyncIcon />
      </Button>
    </Tooltip>
  );

  const advancedSection = (
    <ExpandableSection
      className="tp-plugin__panel-query-container"
      contentId={queryContentID}
      toggleId={queryToggleID}
      isExpanded={showQuery}
      isDetached
      isIndented
    >
      <Form>
        <TimeRangeFormGroup
          label={t('Time')}
          period={search.period}
          onChange={(period: time.Period) => dispatch(setSearch({ ...search, period }))}
          t={t}
        />
        <SearchFormGroup
          label={t('Search Type')}
          search={search}
          onChange={(s: Search) => dispatch(setSearch(s))}
          minDepth={1}
          maxDepth={100}
          t={t}
        />
        <FormGroup className="tp-plugin__panel-query-input" label={queryHelp}>
          <TextArea
            value={search.queryStr}
            onChange={(_event, value) => dispatch(setSearch({ ...search, queryStr: value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                dispatch(setSearch(search));
              }
            }}
            placeholder="domain:class:selector (shift-enter for new line)"
            id={queryInputID}
          />
        </FormGroup>
      </Form>
    </ExpandableSection>
  );

  const topologySection = (
    <Topology
      domains={domains}
      result={result}
      constraint={search.constraint}
      t={t}
      setSearch={(s: Search) => dispatch(setSearch(s))}
    />
  );

  return (
    <>
      <Flex direction={{ default: 'column' }} grow={{ default: 'grow' }}>
        <Flex className="tp-plugin__panel-query-container" direction={{ default: 'row' }}>
          {focusButton}
          <FlexItem align={{ default: 'alignRight' }}>{advancedToggle}</FlexItem>
          {refreshButton}
        </Flex>
        <FlexItem>{advancedSection}</FlexItem>
        <Divider />
        <FlexItem className="tp-plugin__panel-topology-container" grow={{ default: 'grow' }}>
          {topologySection}
        </FlexItem>
      </Flex>
    </>
  );
}

interface TopologyProps {
  domains: korrel8r.Domains;
  result?: Result;
  constraint: korrel8r.Constraint;
  t: TFunction;
  setSearch: (search: Search) => void;
}

const Topology: React.FC<TopologyProps> = ({ domains, result, t, constraint }) => {
  const [loggingAvailable, loggingAvailableLoading] = usePluginAvailable('logging-view-plugin');
  const [netobserveAvailable, netobserveAvailableLoading] = usePluginAvailable('netobserv-plugin');

  if (!result || loggingAvailableLoading || netobserveAvailableLoading) {
    // korrel8r query is loading or the plugin checks are loading
    return <Loading />;
  }

  if (result?.graph?.nodes) {
    // Non-empty graph
    return (
      <Korrel8rTopology
        domains={domains}
        graph={result.graph}
        loggingAvailable={loggingAvailable}
        netobserveAvailable={netobserveAvailable}
        constraint={constraint}
      />
    );
  }

  // eslint-disable-next-line no-console
  console.error(`FIXME not loading`, result);

  return (
    <TopologyInfoState
      titleText={result.message ?
        t('Correlation Error') : t('No Correlation Result')
      }
      // Only display fisrt 400 characters of error to prevent repeating errors
      text={result?.message?.slice(0, 400) || ''}
      isError={!!result.message}
    />
  );
};

const Loading: React.FC = () => {
  const { t } = useTranslation('plugin__troubleshooting-panel-console-plugin');
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState variant={EmptyStateVariant.sm}>
        <EmptyStateHeader
          titleText={t('Loading')}
          headingLevel="h4"
          icon={<EmptyStateIcon icon={Spinner} />}
        />
      </EmptyState>
    </div>
  );
};

interface TopologyInfoStateProps {
  titleText: string;
  text: string;
  isError?: boolean;
}

const TopologyInfoState: React.FC<TopologyInfoStateProps> = ({ titleText, text, isError }) => {
  return (
    <div className="tp-plugin__panel-topology-info">
      <EmptyState variant={EmptyStateVariant.sm}>
        <EmptyStateHeader
          titleText={titleText}
          headingLevel="h4"
          icon={
            <EmptyStateIcon
              icon={isError ? ExclamationCircleIcon : CubesIcon}
              color={isError ? 'var(--pf-v5-global--danger-color--100)' : ''}
            />
          }
        />
        <EmptyStateBody>{text}</EmptyStateBody>
      </EmptyState>
    </div>
  );
};
