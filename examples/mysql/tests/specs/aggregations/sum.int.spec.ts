import { Server } from 'http';
import { statsFactory } from '#tests/factories';
import gql from 'graphql-tag';
import { clearDB, getServer, sendQuery } from '../../utils';

describe('Sum', () => {
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

  it('should return basic sum', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats {
            records {
              sum {
                exp
              }
            }
          }
        }
      `,
    });
    expect(response.data.aggregateStats).toEqual({
      records: [{ sum: { exp: 9 } }],
    });
  });

  it('should return sum with group by', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats(
            groupBy: { exp: true }
            sort: [{ exp: { direction: DESC } }]
          ) {
            records {
              sum {
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
          sum: {
            likes: 102,
          },
        },
        {
          group: {
            exp: 2,
          },
          sum: {
            likes: 1,
          },
        },
        {
          group: {
            exp: 1,
          },
          sum: {
            likes: 0,
          },
        },
      ],
    });
  });
});
