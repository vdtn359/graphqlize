import { Server } from 'http';
import gql from 'graphql-tag';
import { userFactory } from '../../helpers/factories';
import { clearDB, getServer, sendQuery } from '../../helpers/utils';

describe('Count', () => {
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
          username: 'jack-sparrow',
          provider: 'local',
          details: {
            firstName: 'Tuan',
            lastName: 'Nguyen',
          },
        },
        {
          username: 'white-beard',
          provider: 'local',
          details: {
            firstName: 'Tuan',
            lastName: 'Nguyen',
          },
        },
        {
          username: 'black-beard',
          provider: 'facebook',
          details: null,
        },
      ].map(userFactory)
    );
  });

  it('should return basic count', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateUsers {
            records {
              count {
                id
              }
            }
          }
        }
      `,
    });
    expect(response.data.aggregateUsers).toEqual({
      records: [{ count: { id: 3 } }],
    });
  });

  it('should take into account NULL', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateUsers {
            records {
              count {
                details
              }
            }
          }
        }
      `,
    });
    expect(response.data.aggregateUsers).toEqual({
      records: [{ count: { details: 2 } }],
    });
  });

  it('should return count with group by', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateUsers(
            groupBy: { provider: true }
            sort: [{ provider: { direction: ASC } }]
          ) {
            records {
              count {
                details
              }
              group
            }
          }
        }
      `,
    });
    expect(response.data.aggregateUsers).toEqual({
      records: [
        {
          count: {
            details: 0,
          },
          group: {
            provider: 'facebook',
          },
        },
        {
          count: {
            details: 2,
          },
          group: {
            provider: 'local',
          },
        },
      ],
    });
  });
});
