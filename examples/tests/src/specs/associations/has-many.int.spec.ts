import { Server } from 'http';
import gql from 'graphql-tag';
import { clearDB, getServer, sendQuery } from '../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../helpers/assert';
import { userFactory } from '../../helpers/factories';
import { userFragment } from '../../helpers/fragment';

describe('Has many nested associations', () => {
  const mentors: any[] = [];
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
    mentors[0] = await userFactory({
      username: 'brown-beard',
    });

    mentors[1] = await userFactory({
      username: 'john-doe',
    });

    students[0] = await userFactory({
      username: 'jack-sparrow',
      mentorId: mentors[0].id,
    });

    students[1] = await userFactory({
      username: 'white-beard',
      mentorId: mentors[0].id,
    });

    students[2] = await userFactory({
      username: 'jack-ripper',
      mentorId: mentors[1].id,
    });

    students[3] = await userFactory({
      username: 'black-beard',
      mentorId: mentors[1].id,
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
    expect(response.data.listUsers.count).toEqual(2);
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
      response.data.listUsers.records[1].students.records[0]
    );
    expectUserMatchesUserResponse(
      students[3],
      response.data.listUsers.records[1].students.records[1]
    );
    expect(response.data.listUsers.records[0].students.count).toEqual(2);
    expect(response.data.listUsers.records[1].students.count).toEqual(2);
  });

  it('should allow ordering, filtering and pagination', async () => {
    const { body: response } = await sendQuery(server, {
      query: gql`
        query Query {
          listUsers(filter: { students: { username: { _like: "jack%" } } }) {
            records {
              students(
                filter: { mentor: { username: { _contains: "e" } } }
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
    expect(response.data.listUsers.count).toEqual(2);
    expect(response.data.listUsers.records[0].students.count).toEqual(2);
    expectUserMatchesUserResponse(
      students[0],
      response.data.listUsers.records[0].students.records[0]
    );
    expect(response.data.listUsers.records[0].students.records.length).toEqual(
      1
    );
    expect(response.data.listUsers.records[1].students.count).toEqual(2);
    expectUserMatchesUserResponse(
      students[3],
      response.data.listUsers.records[1].students.records[0]
    );
    expect(response.data.listUsers.records[1].students.records.length).toEqual(
      1
    );
  });
});
