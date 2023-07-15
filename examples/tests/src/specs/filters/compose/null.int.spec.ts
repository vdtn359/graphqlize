import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';
import { userFactory } from '../../../helpers/factories';
import { listUsersQuery } from '../../../helpers/queries';

const USERNAME = 'jack-sparrow';
describe('NULL filters', () => {
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
    user = await userFactory({
      username: USERNAME,
      provider: 'local',
      email: 'test@gmail.com',
      verified: true,
    });
  });

  it('should filter belongsTo by NULL (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        mentor: null,
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter hasMany by NULL (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        students: null,
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter belongsTo by NULL (no match)', async () => {
    const mentor: any = await userFactory();
    await user.update({
      mentorId: mentor.id,
    });
    await user.reload();
    const { body: response } = await listUsersQuery(server, {
      filter: {
        mentor: null,
        username: { _eq: USERNAME },
      },
    });

    expect(response.data.listUsers.count).toEqual(0);
  });

  it('should filter hasMany by NULL (no match)', async () => {
    const mentor: any = await userFactory();
    await user.update({
      mentorId: mentor.id,
    });
    await user.reload();

    const { body: response } = await listUsersQuery(server, {
      filter: {
        students: null,
        username: { _eq: mentor.username },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('should filter belongsTo by NOT NULL (match)', async () => {
    const mentor: any = await userFactory();
    await user.update({
      mentorId: mentor.id,
    });
    await user.reload();
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _not: { mentor: null },
        username: { _eq: USERNAME },
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter belongsTo by NOT NULL (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _not: { mentor: null },
        username: { _eq: USERNAME },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });

  it('should filter hasMany by NOT NULL (match)', async () => {
    const mentor: any = await userFactory();
    await user.update({
      mentorId: mentor.id,
    });
    await user.reload();
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _not: { students: null },
        username: { _eq: mentor.username },
      },
    });
    expectUserMatchesUserResponse(mentor, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter hasMany by NOT NULL (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        _not: { students: null },
        username: { _eq: USERNAME },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
