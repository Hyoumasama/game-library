import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePlayHistoryFilter, applyNeverPlayedFilter } from '../../lib/playHistoryFilters.ts';
import { DEFAULT_GAME_FILTERS, buildGameFilterQueryParams, getToggledFilterValues } from '../../lib/gameFilters.ts';

test('Never Played selection reaches the server as a virtual filter', () => {
  const filters = { ...DEFAULT_GAME_FILTERS, ...getToggledFilterValues(DEFAULT_GAME_FILTERS, 'statuses', 'Never Played') };
  const params = buildGameFilterQueryParams(filters, { pageSize: 24 });
  assert.deepEqual(resolvePlayHistoryFilter(params.getAll('status'), params.get('playHistory')), { statuses: [], playHistory: 'never-played' });
});
test('legacy playHistory URLs and mixed virtual status selections normalize consistently', () => {
  assert.deepEqual(resolvePlayHistoryFilter([], 'never-played'), { statuses: [], playHistory: 'never-played' });
  assert.deepEqual(resolvePlayHistoryFilter(['Completed', ' never played ']), { statuses: [], playHistory: 'never-played' });
  assert.deepEqual(resolvePlayHistoryFilter(['Unplayed']), { statuses: ['Unplayed'], playHistory: null });
});
test('Never Played retains missing IGDB IDs while excluding completed copies before pagination', () => {
  const calls=[];
  const query={ eq(...args){calls.push(['eq',...args]);return this;},or(...args){calls.push(['or',...args]);return this;} };
  assert.equal(applyNeverPlayedFilter(query,[10,20]),query);
  assert.deepEqual(calls,[['eq','status','Unplayed'],['or','igdb_id.is.null,igdb_id.not.in.(10,20)']]);
  calls.length=0;applyNeverPlayedFilter(query,[]);
  assert.deepEqual(calls,[['eq','status','Unplayed']]);
});
