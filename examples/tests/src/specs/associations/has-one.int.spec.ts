import { Server } from 'http';
import gql from 'graphql-tag';
import { clearDB, getServer, sendQuery } from '../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../helpers/assert';
import { statsFactory, userFactory } from '../../helpers/factories';
import { userFragment } from '../../helpers/fragment';

describe('Has one nested association', () => {
  let user: any;
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    const stats: any = await statsFactory({
      views: 100,
      likes: 100,
      exp: 3,
    });

    user = await userFactory({
      statsId: stats.id,
      username: 'jack-sparrow',
    });
  });

  it('should query by nested has one', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listStats(filter: { user: { username: { _like: "jack%" } } }) {
            records {
              user {
                ...UserFragment
              }
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(
      user,
      response.data.listStats.records[0].user
    );
    expect(response.data.listStats.count).toEqual(1);
  });
});
