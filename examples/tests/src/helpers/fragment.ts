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
