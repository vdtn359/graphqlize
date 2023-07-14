import { Server } from 'http';
import { statsFactory } from '#tests/factories';
import gql from 'graphql-tag';
import { clearDB, getServer, sendQuery } from '../../utils';

describe('Max', () => {
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    await Promise.all(
      [
        {
          views: 100,
          likes: 100,
          exp: 3,
        },
        {
          views: 10,
          likes: 2,
          exp: 3,
        },
        {
          views: 0,
          likes: 0,
          exp: 1,
        },
        {
          views: 5,
          likes: 1,
          exp: 2,
        },
      ].map(statsFactory)
    );
  });

  it('should return basic max', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats {
            records {
              max {
                exp
              }
            }
          }
        }
      `,
    });
    expect(response.data.aggregateStats).toEqual({
      records: [{ max: { exp: 3 } }],
    });
  });

  it('should return max with group by', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats(
            groupBy: { exp: true }
            sort: [{ exp: { direction: DESC } }]
          ) {
            records {
              max {
                likes
              }
              group
            }
          }
        }
      `,
    });
    expect(response.data.aggregateStats).toEqual({
      records: [
        {
          group: {
            exp: 3,
          },
          max: {
            likes: 100,
          },
        },
        {
          group: {
            exp: 2,
          },
          max: {
            likes: 1,
          },
        },
        {
          group: {
            exp: 1,
          },
          max: {
            likes: 0,
          },
        },
      ],
    });
  });
});
