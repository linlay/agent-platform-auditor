import { check, type Obj } from '../types.js';

export function persistedQuery(rows: Obj[], runId: string): Obj {
  const row = rows.find(value => value._type === 'query' && value.runId === runId && value.query !== undefined);
  check(row, `Persisted query row missing for ${runId}`);
  return row;
}

export function assertLiveSequence(events: Obj[]): void {
  let previous = 0;
  for (const event of events) {
    check(Number.isSafeInteger(event.timestamp) && Number(event.timestamp) > 1e12, 'Timestamp is not epoch milliseconds');
    if (event.type === 'run.activity') {
      check(event.seq === 0, 'run.activity must use unsequenced seq=0');
      continue;
    }
    check(Number.isSafeInteger(event.seq) && Number(event.seq) > previous, 'SSE sequence not strictly increasing');
    previous = Number(event.seq);
  }
}
