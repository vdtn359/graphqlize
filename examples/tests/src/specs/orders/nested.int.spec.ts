import { Server } from 'http';
import gql from 'graphql-tag';
import { clearDB, getServer, sendQuery } from '../../helpers/utils';
import { sequelize } from '../../database/sequelize';
import { listUsersQuery } from '../../helpers/queries';
import { expectUserMatchesUserResponse } from '../../helpers/assert';
import { userFragment } from '../../helpers/fragment';
import { userFactory } from '../../helpers/factories';

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
        exp: 2,
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
          username: 'john-doe',
          statsId: statsList[0].id,
        },
        {
          username: 'black-beard',
          statsId: statsList[1].id,
        },
        {
          username: 'white-beard',
          statsId: statsList[2].id,
        },
        {
          username: 'brown-beard',
          statsId: statsList[3].id,
        },
      ].map(userFactory)
    );
  });

  it('should order by nested columns correctly', async () => {
    const { body: response } = await listUsersQuery(server, {
      sort: [
        {
          stats: { likes: { direction: 'DESC' } },
        },
        {
          stats: { exp: { direction: 'ASC' } },
        },
        {
          username: { direction: 'DESC' },
        },
      ],
    });
    expect(response.data.listUsers.count).toEqual(4);
    expectUserMatchesUserResponse(
      usersList[3],
      response.data.listUsers.records[0]
    );
    expectUserMatchesUserResponse(
      usersList[2],
      response.data.listUsers.records[1]
    );
    expectUserMatchesUserResponse(
      usersList[1],
      response.data.listUsers.records[2]
    );
    expectUserMatchesUserResponse(
      usersList[0],
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
      usersList[1],
      response.data.listUsers.records[0]
    );
    expectUserMatchesUserResponse(
      usersList[2],
      response.data.listUsers.records[1]
    );
    expectUserMatchesUserResponse(
      usersList[0],
      response.data.listUsers.records[2]
    );
    expectUserMatchesUserResponse(
      usersList[3],
      response.data.listUsers.records[3]
    );
  });
});
