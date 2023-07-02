import { Server } from 'http';
import { clearDB, getServer, sendQuery } from '#tests/utils';
import { sequelize } from '#tests/sequelize';
import { listUsersQuery } from '#tests/queries';
import { expectUserMatchesUserResponse } from '#tests/assert';
import gql from 'graphql-tag';
import { userFragment } from '#tests/fragment';
import { userFactory } from '#tests/factories';

describe('Nested ordering', () => {
  let usersList: any[];
  let server: Server;

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

    usersList = await Promise.all(
      [
        {
          statsId: statsList[0].id,
        },
        {
          statsId: statsList[1].id,
        },
        {
          statsId: statsList[2].id,
        },
        {
          statsId: statsList[3].id,
        },
      ].map(userFactory)
    );
  });

  it('should order by nested columns correctly', async () => {
    const { body: response } = await listUsersQuery(server, {
      sort: [{ stats: { views: { direction: 'ASC' } } }],
    });
    expect(response.data.listUsers.count).toEqual(4);
    expectUserMatchesUserResponse(
      usersList[2],
      response.data.listUsers.records[0]
    );
    expectUserMatchesUserResponse(
      usersList[0],
      response.data.listUsers.records[1]
    );
    expectUserMatchesUserResponse(
      usersList[1],
      response.data.listUsers.records[2]
    );
    expectUserMatchesUserResponse(
      usersList[3],
      response.data.listUsers.records[3]
    );
  });

  it('should work with order by variables', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query($orderBy: SortUser!) {
          listUsers(sort: [$orderBy]) {
            records {
              ...UserFragment
            }
            count
          }
        }
        ${userFragment}
      `,
      variables: {
        orderBy: { stats: { views: { direction: 'ASC' } } },
      },
    });
    expect(response.data.listUsers.count).toEqual(4);
    expectUserMatchesUserResponse(
      usersList[2],
      response.data.listUsers.records[0]
    );
    expectUserMatchesUserResponse(
      usersList[0],
      response.data.listUsers.records[1]
    );
    expectUserMatchesUserResponse(
      usersList[1],
      response.data.listUsers.records[2]
    );
    expectUserMatchesUserResponse(
      usersList[3],
      response.data.listUsers.records[3]
    );
  });
});
