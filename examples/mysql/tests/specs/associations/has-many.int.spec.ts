import { Server } from 'http';
import { clearDB, getServer, sendQuery } from '#tests/utils';
import { expectUserMatchesUserResponse } from '#tests/assert';
import { userFactory } from '#tests/factories';
import gql from 'graphql-tag';
import { userFragment } from '#tests/fragment';

describe('Has many nested associations', () => {
  let mentor: any;
  const students: any[] = [];
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

    students[0] = await userFactory({
      username: 'jack-sparrow',
      mentorId: mentor.id,
    });

    students[1] = await userFactory({
      username: 'white-beard',
      mentorId: mentor.id,
    });

    students[2] = await userFactory({
      username: 'black-beard',
      mentorId: mentor.id,
    });
  });

  it('should query by nested has many', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { students: { username: { _like: "jack%" } } }) {
            records {
              students {
                records {
                  ...UserFragment
                }
                count
              }
            }
            count
          }
        }
        ${userFragment}
      `,
    });
    expectUserMatchesUserResponse(
      students[0],
      response.data.listUsers.records[0].students.records[0]
    );
    expectUserMatchesUserResponse(
      students[1],
      response.data.listUsers.records[0].students.records[1]
    );
    expectUserMatchesUserResponse(
      students[2],
      response.data.listUsers.records[0].students.records[2]
    );
    expect(response.data.listUsers.records[0].students.count).toEqual(3);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should allow ordering, filtering and pagination', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { students: { username: { _like: "jack%" } } }) {
            records {
              students(
                filter: { username: { _like: "%beard" } }
                pagination: { limit: 1, offset: 1 }
                sort: [{ username: { direction: DESC } }]
              ) {
                records {
                  ...UserFragment
                }
                count
              }
            }
            count
          }
        }
        ${userFragment}
      `,
    });

    expectUserMatchesUserResponse(
      students[2],
      response.data.listUsers.records[0].students.records[0]
    );
    expect(response.data.listUsers.records[0].students.count).toEqual(2);
    expect(response.data.listUsers.records[0].students.records.length).toEqual(
      1
    );
    expect(response.data.listUsers.count).toEqual(1);
  });
});
