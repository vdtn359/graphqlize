import { Server } from 'http';
import gql from 'graphql-tag';
import { statsFactory } from '../../helpers/factories';
import { clearDB, getServer, sendQuery } from '../../helpers/utils';

describe('Min', () => {
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

  it('should return basic min', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats {
            records {
              min {
                exp
              }
            }
          }
        }
      `,
    });
    expect(response.data.aggregateStats).toEqual({
      records: [{ min: { exp: 1 } }],
    });
  });

  it('should return min with group by', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateStats(
            groupBy: { exp: true }
            sort: [{ _min: { likes: { direction: ASC } } }]
          ) {
            records {
              min {
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
            exp: 1,
          },
          min: {
            likes: 0,
          },
        },
        {
          group: {
            exp: 2,
          },
          min: {
            likes: 1,
          },
        },
        {
          group: {
            exp: 3,
          },
          min: {
            likes: 2,
          },
        },
      ],
    });
  });
});
