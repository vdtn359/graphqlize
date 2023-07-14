import { Server } from 'http';
import { userFactory } from '#tests/factories';
import gql from 'graphql-tag';
import { sequelize } from '#tests/sequelize';
import { clearDB, getServer, sendQuery } from '../../utils';

describe('Nested', () => {
  let server: Server;
  let users: any[];

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    const statsList: any[] = await sequelize.models.stats.bulkCreate([
      {
        views: 100,
        likes: 30,
        exp: 3,
      },
      {
        views: 10,
        likes: 30,
        exp: 2,
      },
      {
        views: 20,
        likes: 30,
        exp: 6,
      },
      {
        views: 1000,
        likes: 500,
        exp: 10,
      },
    ]);

    users = await Promise.all(
      [
        {
          id: 1,
          username: 'john-doe',
          statsId: statsList[0].id,
        },
        {
          id: 2,
          username: 'black-beard',
          statsId: statsList[1].id,
        },
        {
          id: 3,
          username: 'white-beard',
          statsId: statsList[2].id,
        },
        {
          id: 4,
          username: 'brown-beard',
          statsId: statsList[3].id,
        },
      ].map(userFactory)
    );
    await users[1].update({
      mentorId: users[0].id,
    });
    await users[2].update({
      mentorId: users[0].id,
    });
    await users[3].update({
      mentorId: users[1].id,
    });
  });

  it('should return nested aggregate', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          aggregateUsers(
            groupBy: { mentorId: true }
            filter: { _count: { id: { _gte: 1 } }, mentorId: { _neq: null } }
            sort: [{ mentorId: { direction: ASC } }]
          ) {
            records {
              avg {
                stats {
                  exp
                }
              }
              count {
                id
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
          avg: {
            stats: {
              exp: 4,
            },
          },
          count: {
            id: 2,
          },
          group: {
            mentorId: 1,
          },
        },
        {
          avg: {
            stats: {
              exp: 10,
            },
          },
          count: {
            id: 1,
          },
          group: {
            mentorId: 2,
          },
        },
      ],
    });
  });
});
