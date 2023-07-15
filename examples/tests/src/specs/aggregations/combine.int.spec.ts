import { Server } from 'http';
import gql from 'graphql-tag';
import { statsFactory } from '../../helpers/factories';
import { clearDB, getServer, sendQuery } from '../../helpers/utils';

describe('Combine', () => {
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

  it('should return basic combination of aggregates', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats {
            records {
              avg {
                views
              }
              max {
                likes
              }
            }
          }
        }
      `,
    });
    expect(response.data.aggregateStats).toEqual({
      records: [
        {
          avg: {
            views: 28.75,
          },
          max: {
            likes: 100,
          },
        },
      ],
    });
  });

  it('should return combination with group by', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats(
            groupBy: { exp: true }
            sort: { exp: { direction: ASC } }
          ) {
            records {
              avg {
                views
              }
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
          avg: {
            views: 0,
          },
          group: {
            exp: 1,
          },
          max: {
            likes: 0,
          },
        },
        {
          avg: {
            views: 5,
          },
          group: {
            exp: 2,
          },
          max: {
            likes: 1,
          },
        },
        {
          avg: {
            views: 55,
          },
          group: {
            exp: 3,
          },
          max: {
            likes: 100,
          },
        },
      ],
    });
  });
});
