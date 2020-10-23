import { of } from 'rxjs';
import { queryBuilder } from '../shared/testing/builders';
import { FieldType, observableTester, toDataFrame } from '@grafana/data';
import { initialQueryVariableModelState, updateVariableOptions, updateVariableTags } from './reducer';
import { toVariablePayload } from '../state/types';
import { VariableRefresh } from '../types';
import {
  areMetricFindValues,
  runUpdateTagsRequest,
  toMetricFindValues,
  updateOptionsState,
  updateTagsState,
  validateVariableSelection,
} from './operators';

describe('operators', () => {
  describe('validateVariableSelectionState', () => {
    describe('when called', () => {
      it('then the correct observable should be created', done => {
        const variable = queryBuilder()
          .withId('query')
          .build();
        const dispatch = jest.fn().mockResolvedValue({});
        const observable = of(undefined).pipe(validateVariableSelection({ variable, dispatch }));

        observableTester().subscribeAndExpectOnNext({
          observable,
          expect: value => {
            expect(value).toEqual({});
            expect(dispatch).toHaveBeenCalledTimes(1);
          },
          done,
        });
      });
    });
  });

  describe('updateTagsState', () => {
    describe('when called with a variable that uses Tags', () => {
      it('then the correct observable should be created', done => {
        const variable = queryBuilder()
          .withId('query')
          .withTags(true)
          .build();
        const dispatch = jest.fn().mockResolvedValue({});
        const observable = of([{ text: 'A text' }]).pipe(updateTagsState({ variable, dispatch }));

        observableTester().subscribeAndExpectOnNext({
          observable,
          expect: value => {
            expect(value).toEqual(undefined);
            expect(dispatch).toHaveBeenCalledTimes(1);
            expect(dispatch).toHaveBeenCalledWith(
              updateVariableTags(toVariablePayload(variable, [{ text: 'A text' }]))
            );
          },
          done,
        });
      });
    });

    describe('when called with a variable that does not use Tags', () => {
      it('then the correct observable should be created', done => {
        const variable = queryBuilder()
          .withId('query')
          .withTags(false)
          .build();
        const dispatch = jest.fn().mockResolvedValue({});
        const observable = of([{ text: 'A text' }]).pipe(updateTagsState({ variable, dispatch }));

        observableTester().subscribeAndExpectOnNext({
          observable,
          expect: value => {
            expect(value).toEqual(undefined);
            expect(dispatch).not.toHaveBeenCalled();
          },
          done,
        });
      });
    });
  });

  describe('runUpdateTagsRequest', () => {
    describe('when called with a datasource with metricFindQuery and variable that uses Tags and refreshes on time range changes', () => {
      it('then the correct observable should be created', done => {
        const variable = queryBuilder()
          .withId('query')
          .withTags(true)
          .withTagsQuery('A tags query')
          .withRefresh(VariableRefresh.onTimeRangeChanged)
          .build();
        const timeSrv: any = {
          timeRange: jest.fn(),
        };
        const dataSource: any = { metricFindQuery: jest.fn().mockResolvedValue([{ text: 'A text' }]) };
        const searchFilter = 'A search filter';
        const observable = of(undefined).pipe(runUpdateTagsRequest({ variable, dataSource, searchFilter }, timeSrv));

        observableTester().subscribeAndExpectOnNext({
          observable,
          expect: value => {
            const { index, global, ...rest } = initialQueryVariableModelState;
            expect(value).toEqual([{ text: 'A text' }]);
            expect(timeSrv.timeRange).toHaveBeenCalledTimes(1);
            expect(dataSource.metricFindQuery).toHaveBeenCalledTimes(1);
            expect(dataSource.metricFindQuery).toHaveBeenCalledWith('A tags query', {
              range: undefined,
              searchFilter: 'A search filter',
              variable: {
                ...rest,
                id: 'query',
                name: 'query',
                useTags: true,
                tagsQuery: 'A tags query',
                refresh: VariableRefresh.onTimeRangeChanged,
              },
            });
          },
          done,
        });
      });
    });

    describe('when called with a datasource without metricFindQuery and variable that uses Tags and refreshes on time range changes', () => {
      it('then the correct observable should be created', done => {
        const variable = queryBuilder()
          .withId('query')
          .withTags(true)
          .withTagsQuery('A tags query')
          .withRefresh(VariableRefresh.onTimeRangeChanged)
          .build();
        const timeSrv: any = {
          timeRange: jest.fn(),
        };
        const dataSource: any = {};
        const searchFilter = 'A search filter';
        const observable = of(undefined).pipe(runUpdateTagsRequest({ variable, dataSource, searchFilter }, timeSrv));

        observableTester().subscribeAndExpectOnNext({
          observable,
          expect: value => {
            expect(value).toEqual([]);
            expect(timeSrv.timeRange).not.toHaveBeenCalled();
          },
          done,
        });
      });
    });

    describe('when called with a datasource with metricFindQuery and variable that does not use Tags but refreshes on time range changes', () => {
      it('then the correct observable should be created', done => {
        const variable = queryBuilder()
          .withId('query')
          .withTags(false)
          .withRefresh(VariableRefresh.onTimeRangeChanged)
          .build();
        const timeSrv: any = {
          timeRange: jest.fn(),
        };
        const dataSource: any = { metricFindQuery: jest.fn().mockResolvedValue([{ text: 'A text' }]) };
        const searchFilter = 'A search filter';
        const observable = of(undefined).pipe(runUpdateTagsRequest({ variable, dataSource, searchFilter }, timeSrv));

        observableTester().subscribeAndExpectOnNext({
          observable,
          expect: value => {
            expect(value).toEqual([]);
            expect(timeSrv.timeRange).not.toHaveBeenCalled();
            expect(dataSource.metricFindQuery).not.toHaveBeenCalled();
          },
          done,
        });
      });
    });
  });

  describe('updateOptionsState', () => {
    describe('when called', () => {
      it('then the correct observable should be created', done => {
        const variable = queryBuilder()
          .withId('query')
          .build();
        const dispatch = jest.fn();
        const getTemplatedRegexFunc = jest.fn().mockReturnValue('getTemplatedRegexFunc result');

        const observable = of([{ text: 'A' }]).pipe(updateOptionsState({ variable, dispatch, getTemplatedRegexFunc }));

        observableTester().subscribeAndExpectOnNext({
          observable,
          expect: value => {
            expect(value).toEqual(undefined);
            expect(getTemplatedRegexFunc).toHaveBeenCalledTimes(1);
            expect(dispatch).toHaveBeenCalledTimes(1);
            expect(dispatch).toHaveBeenCalledWith(
              updateVariableOptions({
                id: 'query',
                type: 'query',
                data: { results: [{ text: 'A' }], templatedRegex: 'getTemplatedRegexFunc result' },
              })
            );
          },
          done,
        });
      });
    });
  });

  describe('toMetricFindValues', () => {
    const frameWithTextField = toDataFrame({
      fields: [{ name: 'text', type: FieldType.string, values: ['A', 'B', 'C'] }],
    });
    const frameWithValueField = toDataFrame({
      fields: [{ name: 'value', type: FieldType.string, values: ['A', 'B', 'C'] }],
    });
    const frameWithTextAndValueField = toDataFrame({
      fields: [
        { name: 'text', type: FieldType.string, values: ['TA', 'TB', 'TC'] },
        { name: 'value', type: FieldType.string, values: ['VA', 'VB', 'VC'] },
      ],
    });
    const frameWithoutTextAndValueField = toDataFrame({
      fields: [{ name: 'label', type: FieldType.string, values: ['A', 'B', 'C'] }],
    });
    const frameWithExpandableField = toDataFrame({
      fields: [
        { name: 'label', type: FieldType.string, values: ['A', 'B', 'C'] },
        { name: 'expandable', type: FieldType.boolean, values: [true, false, true] },
      ],
    });

    // it.each wouldn't work here as we need the done callback
    [
      { series: null, expected: [] },
      { series: undefined, expected: [] },
      { series: [], expected: [] },
      { series: [{ text: '' }], expected: [{ text: '' }] },
      { series: [{ value: '' }], expected: [{ value: '' }] },
      {
        series: [frameWithTextField],
        expected: [
          { text: 'A', value: 'A' },
          { text: 'B', value: 'B' },
          { text: 'C', value: 'C' },
        ],
      },
      {
        series: [frameWithValueField],
        expected: [
          { text: 'A', value: 'A' },
          { text: 'B', value: 'B' },
          { text: 'C', value: 'C' },
        ],
      },
      {
        series: [frameWithTextAndValueField],
        expected: [
          { text: 'TA', value: 'VA' },
          { text: 'TB', value: 'VB' },
          { text: 'TC', value: 'VC' },
        ],
      },
      {
        series: [frameWithoutTextAndValueField],
        expected: [
          { text: 'A', value: 'A' },
          { text: 'B', value: 'B' },
          { text: 'C', value: 'C' },
        ],
      },
      {
        series: [frameWithExpandableField],
        expected: [
          { text: 'A', value: 'A', expandable: true },
          { text: 'B', value: 'B', expandable: false },
          { text: 'C', value: 'C', expandable: true },
        ],
      },
    ].map(scenario => {
      it(`when called with series:${JSON.stringify(scenario.series, null, 0)}`, done => {
        const { series, expected } = scenario;
        const panelData: any = { series };
        const observable = of(panelData).pipe(toMetricFindValues());

        observableTester().subscribeAndExpectOnNext({
          observable,
          expect: value => {
            expect(value).toEqual(expected);
          },
          done,
        });
      });
    });
  });
});

describe('areMetricFindValues', () => {
  it.each`
    values                       | expected
    ${null}                      | ${false}
    ${undefined}                 | ${false}
    ${[]}                        | ${true}
    ${[{ text: '' }]}            | ${true}
    ${[{ Text: '' }]}            | ${true}
    ${[{ value: '' }]}           | ${true}
    ${[{ Value: '' }]}           | ${true}
    ${[{ text: '', value: '' }]} | ${true}
    ${[{ Text: '', Value: '' }]} | ${true}
  `('when called with values:$values', ({ values, expected }) => {
    expect(areMetricFindValues(values)).toBe(expected);
  });
});