import { Server } from 'http';
import { statsFactory } from '#tests/factories';
import gql from 'graphql-tag';
import { clearDB, getServer, sendQuery } from '../../utils';

describe('Avg', () => {
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

  it('should return basic avg', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats {
            records {
              avg {
                likes
              }
            }
          }
        }
      `,
    });
    expect(response.data.aggregateStats).toEqual({
      records: [{ avg: { likes: 25.75 } }],
    });
  });

  it('should return avg with group by', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats(
            groupBy: { exp: true }
            sort: [{ _avg: { likes: { direction: DESC } } }]
          ) {
            records {
              avg {
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
          avg: {
            likes: 51,
          },
          group: {
            exp: 3,
          },
        },
        {
          avg: {
            likes: 1,
          },
          group: {
            exp: 2,
          },
        },
        {
          avg: {
            likes: 0,
          },
          group: {
            exp: 1,
          },
        },
      ],
    });
  });
});
