import { Server } from 'http';
import { clearDB, getServer } from '#tests/utils';
import { sequelize } from '#tests/sequelize';
import { listStatsQuery } from '#tests/queries';
import { expectStatsMatchesStatsResponse } from '#tests/assert';

describe('Basic ordering', () => {
  let stats: any[];
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    stats = await sequelize.models.stats.bulkCreate([
      {
        views: 100,
        likes: 50,
        exp: 3,
      },
      {
        views: 100,
        likes: 30,
        exp: 2,
      },
      {
        views: 10,
        likes: 5,
        exp: 1,
      },
      {
        views: 1000,
        likes: 500,
        exp: 10,
      },
    ]);
  });

  it('should order by ASC correctly', async () => {
    const { body: response } = await listStatsQuery(server, {
      sort: [{ likes: { direction: 'ASC' } }],
    });
    expect(response.data.listStats.count).toEqual(4);
    expectStatsMatchesStatsResponse(
      stats[2],
      response.data.listStats.records[0]
    );
    expectStatsMatchesStatsResponse(
      stats[1],
      response.data.listStats.records[1]
    );
    expectStatsMatchesStatsResponse(
      stats[0],
      response.data.listStats.records[2]
    );
    expectStatsMatchesStatsResponse(
      stats[3],
      response.data.listStats.records[3]
    );
  });

  it('should order by DESC correctly', async () => {
    const { body: response } = await listStatsQuery(server, {
      sort: [{ likes: { direction: 'DESC' } }],
    });
    expect(response.data.listStats.count).toEqual(4);
    expectStatsMatchesStatsResponse(
      stats[3],
      response.data.listStats.records[0]
    );
    expectStatsMatchesStatsResponse(
      stats[0],
      response.data.listStats.records[1]
    );
    expectStatsMatchesStatsResponse(
      stats[1],
      response.data.listStats.records[2]
    );
    expectStatsMatchesStatsResponse(
      stats[2],
      response.data.listStats.records[3]
    );
  });

  it('should order by multiple columns correctly', async () => {
    const { body: response } = await listStatsQuery(server, {
      sort: [{ views: { direction: 'ASC' } }, { likes: { direction: 'DESC' } }],
    });
    expect(response.data.listStats.count).toEqual(4);
    expectStatsMatchesStatsResponse(
      stats[2],
      response.data.listStats.records[0]
    );
    expectStatsMatchesStatsResponse(
      stats[0],
      response.data.listStats.records[1]
    );
    expectStatsMatchesStatsResponse(
      stats[1],
      response.data.listStats.records[2]
    );
    expectStatsMatchesStatsResponse(
      stats[3],
      response.data.listStats.records[3]
    );
  });
});
