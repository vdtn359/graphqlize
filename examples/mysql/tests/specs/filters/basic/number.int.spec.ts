import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { expectStatsMatchesStatsResponse } from '#tests/assert';
import { statsFactory } from '#tests/factories';
import { listStatsQuery } from '#tests/queries';

describe('Number filters', () => {
  let stats: any;
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    stats = await statsFactory({
      likes: 50,
    });
  });

  it('empty', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: { likes: {} },
    });
    expectStatsMatchesStatsResponse(stats, response.data.listStats.records[0]);
    expect(response.data.listStats.count).toEqual(1);
  });

  it('eq', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _eq: 50,
        },
      },
    });
    expectStatsMatchesStatsResponse(stats, response.data.listStats.records[0]);
    expect(response.data.listStats.count).toEqual(1);
  });

  it('ne', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _neq: 50,
        },
      },
    });
    expect(response.data.listStats.count).toEqual(0);
  });

  it('in', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _in: [50],
        },
      },
    });
    expectStatsMatchesStatsResponse(stats, response.data.listStats.records[0]);
    expect(response.data.listStats.count).toEqual(1);
  });

  it('notIn', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _notIn: [50],
        },
      },
    });
    expect(response.data.listStats.count).toEqual(0);
  });

  it('between', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _between: [49, 51],
        },
      },
    });
    expectStatsMatchesStatsResponse(stats, response.data.listStats.records[0]);
    expect(response.data.listStats.count).toEqual(1);
  });

  it('notBetween', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _notBetween: [49, 51],
        },
      },
    });
    expect(response.data.listStats.count).toEqual(0);
  });

  it('gt', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _gt: 49,
        },
      },
    });
    expectStatsMatchesStatsResponse(stats, response.data.listStats.records[0]);
    expect(response.data.listStats.count).toEqual(1);
  });

  it('gte', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _gte: 50,
        },
      },
    });
    expectStatsMatchesStatsResponse(stats, response.data.listStats.records[0]);
    expect(response.data.listStats.count).toEqual(1);
  });

  it('lt', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _lt: 51,
        },
      },
    });
    expectStatsMatchesStatsResponse(stats, response.data.listStats.records[0]);
    expect(response.data.listStats.count).toEqual(1);
  });

  it('lte', async () => {
    const { body: response } = await listStatsQuery(server, {
      filter: {
        likes: {
          _lte: 50,
        },
      },
    });
    expectStatsMatchesStatsResponse(stats, response.data.listStats.records[0]);
    expect(response.data.listStats.count).toEqual(1);
  });
});
