import { sequelize } from './sequelize';

function pickRandom(args: any[]) {
  return args[Math.floor(Math.random() * args.length)];
}

function randomDate() {
  return new Date(new Date().getTime() - 200000000000 * Math.random());
}

const seed = async () => {
  const stats = (await sequelize.models.stats.bulkCreate([
    {
      views: 100,
      likes: 100,
      exp: 3,
    },
    {
      views: 10,
      likes: 2,
      exp: 1,
    },
    {
      views: 0,
      likes: 0,
      exp: 0,
    },
    {
      views: 5,
      likes: 1,
      exp: 2,
    },
  ])) as any[];
  const users = (await sequelize.models.user.bulkCreate([
    {
      username: 'jack-sparrow',
      provider: 'local',
      email: 'test@gmail.com',
      statsId: stats[0].id,
      verified: true,
      details: {
        firstName: 'Tuan',
        lastName: 'Nguyen',
      },
    },
    {
      username: 'white-beard',
      provider: 'local',
      email: 'test+1@gmail.com',
      statsId: stats[1].id,
      verified: true,
      details: {
        firstName: 'John',
        lastName: 'Doe',
      },
    },
    {
      username: 'black-beard',
      provider: 'facebook',
      email: 'test+3@gmail.com',
      statsId: stats[2].id,
      verified: false,
      details: {
        firstName: 'Test',
        lastName: 'Here',
      },
    },
    {
      username: 'brown-beard',
      provider: 'google',
      email: 'test+2@gmail.com',
      verified: false,
      statsId: stats[3].id,
    },
  ])) as any;

  const sessions = (await sequelize.models.session.bulkCreate([
    {
      name: '1st session',
      location: 'Paris',
      start: '2021-01-01T00:00:00Z',
      end: '2021-01-01T09:00:00Z',
    },
    {
      name: '2nd session',
      location: 'New York',
      start: '2021-02-01T04:00:00Z',
      end: '2021-02-01T06:00:00Z',
    },
    {
      name: '3rd session',
      location: 'London',
      start: '2021-03-01T04:00:00Z',
      end: '2021-03-01T07:00:00Z',
    },
  ])) as any;

  await sequelize.models.userSession.bulkCreate([
    {
      userId: users[0].id,
      sessionId: sessions[0].id,
      time: '2021-01-01T00:00:00Z',
    },
    {
      userId: users[1].id,
      sessionId: sessions[0].id,
      time: '2021-01-01T01:00:00Z',
    },
    {
      userId: users[2].id,
      sessionId: sessions[0].id,
      time: '2021-01-01T03:00:00Z',
    },
    {
      userId: users[1].id,
      sessionId: sessions[1].id,
      time: '2021-02-01T04:00:00Z',
    },
    {
      userId: users[3].id,
      sessionId: sessions[1].id,
      time: '2021-02-01T06:00:00Z',
    },
    {
      userId: users[0].id,
      sessionId: sessions[2].id,
      time: '2021-02-01T05:00:00Z',
    },
    {
      userId: users[2].id,
      sessionId: sessions[2].id,
      time: '2021-02-01T05:00:00Z',
    },
  ]);

  await users[1].update({
    mentorId: users[0].id,
  });

  await users[3].update({
    mentorId: users[1].id,
  });

  await sequelize.models.orchestra.bulkCreate([
    { name: 'Jalisco Philharmonic' },
    { name: 'Symphony No. 4' },
    { name: 'Symphony No. 8' },
  ]);

  // Let's create random instruments for each orchestra
  for (const orchestra of await sequelize.models.orchestra.findAll()) {
    for (let i = 0; i < 2; i++) {
      const type = pickRandom([
        'violin',
        'trombone',
        'flute',
        'harp',
        'trumpet',
        'piano',
        'guitar',
        'pipe organ',
      ]);

      // eslint-disable-next-line no-await-in-loop
      await sequelize.models.instrument.create({
        type,
        purchaseDate: randomDate(),
        description: `This is a ${type}`,
        orchestraId: (orchestra as any).id,
        userId: pickRandom(users).id,
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Done!');
};

async function start() {
  await sequelize.sync({ force: true });
  if (process.env.CREATE_DATA !== 'false') {
    await seed();
  }
  await sequelize.close();
}

start();
