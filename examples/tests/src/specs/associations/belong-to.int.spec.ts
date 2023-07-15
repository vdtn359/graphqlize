import { Server } from 'http';
import gql from 'graphql-tag';
import { clearDB, getServer, sendQuery } from '../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../helpers/assert';
import { userFactory } from '../../helpers/factories';
import { userFragment } from '../../helpers/fragment';

describe('Belong To nested associations', () => {
  let mentor: any;
  let server: Server;

  beforeAll(async () => {
    server = await getServer();
  });
  afterAll(async () => {
    await server.close();
  });

  beforeEach(async () => clearDB());

  beforeEach(async () => {
    mentor = await userFactory({
      username: 'brown-beard',
    });

    await userFactory({
      mentorId: mentor.id,
    });
  });

  it('should query by nested belong to', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { mentor: { username: { _like: "brown%" } } }) {
            records {
              mentor {
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
      mentor,
      response.data.listUsers.records[0].mentor
    );
    expect(response.data.listUsers.count).toEqual(1);
  });
});
