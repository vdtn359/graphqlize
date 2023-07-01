export const expectDate = (date: Date) => {
  const expectedDate = new Date(date);
  expectedDate.setMilliseconds(0);

  return {
    asymmetricMatch(received: Date) {
      const actualDate = new Date(received);
      actualDate.setMilliseconds(0);
      return actualDate.getTime() === expectedDate.getTime();
    },
  };
};

export const expectUserMatchesUserResponse = (user: any, userResponse: any) => {
  expect(userResponse).toEqual(
    expect.objectContaining({
      id: user.id,
      username: user.username,
      details: user.details ?? null,
      email: user.email,
      mentorId: user.mentorId ?? null,
      statsId: user.statsId ?? null,
      provider: user.provider,
      verified: user.verified,
      createdAt: expectDate(user.createdAt),
      updatedAt: expectDate(user.updatedAt),
    })
  );
};

export const expectStatsMatchesStatsResponse = (
  stats: any,
  statsResponse: any
) => {
  expect(statsResponse).toEqual({
    id: stats.id,
    likes: stats.likes,
    exp: stats.exp,
    views: stats.views,
    createdAt: expectDate(stats.createdAt),
    updatedAt: expectDate(stats.updatedAt),
  });
};

export const expectUserSessionMatchesUserSessionResponse = (
  userSession: any,
  userSessionResponse: any
) => {
  expect(userSessionResponse).toEqual({
    id: userSession.id,
    time: expectDate(userSession.time),
    userId: userSession.userId,
    sessionId: userSession.sessionId,
    createdAt: expectDate(userSession.createdAt),
    updatedAt: expectDate(userSession.updatedAt),
  });
};

export const expectSessionMatchesSessionResponse = (
  session: any,
  sessionResponse: any
) => {
  expect(sessionResponse).toEqual({
    id: session.id,
    name: session.name,
    location: session.location,
    start: expectDate(session.start),
    end: expectDate(session.end),
    createdAt: expectDate(session.createdAt),
    updatedAt: expectDate(session.updatedAt),
  });
};
