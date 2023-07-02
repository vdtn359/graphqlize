import gql from 'graphql-tag';

export const userFragment = gql`
  fragment UserFragment on User {
    id
    username
    details
    email
    mentorId
    statsId
    provider
    verified
    createdAt
    updatedAt
  }
`;

export const customUserFragment = gql`
  fragment CustomUserFragment on CustomUser {
    id
    username
    details
    email
    mentorId
    statsId
    provider
    verified
    createdAt
    updatedAt
  }
`;

export const statsFragment = gql`
  fragment StatsFragment on Stat {
    id
    exp
    likes
    views
    createdAt
    updatedAt
  }
`;

export const userSessionFragment = gql`
  fragment UserSessionFragment on UserSession {
    id
    time
    userId
    sessionId
    createdAt
    updatedAt
  }
`;

export const sessionFragment = gql`
  fragment SessionFragment on Session {
    id
    start
    end
    location
    name
    createdAt
    updatedAt
  }
`;
