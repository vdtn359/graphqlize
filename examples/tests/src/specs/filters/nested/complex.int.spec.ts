import { Server } from 'http';
import { clearDB, getServer } from '../../../helpers/utils';
import { expectUserMatchesUserResponse } from '../../../helpers/assert';
import {
  instrumentFactory,
  statsFactory,
  userFactory,
} from '../../../helpers/factories';
import { sequelize } from '../../../database/sequelize';
import { listUsersQuery } from '../../../helpers/queries';

describe('Complex filters', () => {
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
    const mentorStats: any = await statsFactory({
      views: 1000,
      likes: 500,
      exp: 10,
    });

    const mentor: any = await userFactory({
      username: 'brown-beard',
      provider: 'google',
      email: 'test+1@gmail.com',
      statsId: mentorStats.id,
      verified: true,
    });

    const stats: any = await statsFactory({
      views: 100,
      likes: 50,
      exp: 3,
    });

    user = await userFactory({
      username: 'jack-sparrow',
      provider: 'local',
      email: 'test@gmail.com',
      verified: true,
      mentorId: mentor.id,
      statsId: stats.id,
    });

    const orchestra: any = await sequelize.models.orchestra.create({
      name: 'Jalisco Philharmonic',
    });

    await instrumentFactory({
      type: 'violin',
      orchestraId: orchestra.id,
      userId: user.id,
    });
    await instrumentFactory({
      type: 'piano',
      orchestraId: orchestra.id,
      userId: mentor.id,
    });

    const session: any = await sequelize.models.session.create({
      name: '1st session',
      location: 'Paris',
      start: '2021-01-01T00:00:00Z',
      end: '2021-01-01T09:00:00Z',
    });

    await sequelize.models.userSession.create({
      userId: user.id,
      sessionId: session.id,
      time: '2021-01-01T05:00:00Z',
    });

    await sequelize.models.userSession.create({
      userId: mentor.id,
      sessionId: session.id,
      time: '2021-01-01T07:00:00Z',
    });

    const session2: any = await sequelize.models.session.create({
      name: '2nd session',
      location: 'Paris',
      start: '2021-01-01T00:00:00Z',
      end: '2021-01-01T09:00:00Z',
    });

    await sequelize.models.userSession.create({
      userId: user.id,
      sessionId: session2.id,
      time: '2021-01-01T05:00:00Z',
    });
  });

  it('should filter by nested filter (match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        mentor: {
          stats: { exp: { _eq: 10 } },
          students: { stats: { exp: { _eq: 3 } } },
        },
        instruments: { orchestra: { name: { _iLike: 'jalisco%' } } },
        userSessions: {
          session: { location: { _eq: 'Paris' } },
        },
      },
    });
    expectUserMatchesUserResponse(user, response.data.listUsers.records[0]);
    expect(response.data.listUsers.count).toEqual(1);
  });

  it('should filter by nested query (no match)', async () => {
    const { body: response } = await listUsersQuery(server, {
      filter: {
        mentor: {
          stats: { exp: { _eq: 10 } },
          students: { stats: { exp: { _eq: 3 } } },
        },
        instruments: { orchestra: { name: { _iLike: 'jalisco%' } } },
        userSessions: {
          session: { location: { _eq: 'London' } },
        },
      },
    });
    expect(response.data.listUsers.count).toEqual(0);
  });
});
