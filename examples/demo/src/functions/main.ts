import { handlerPath } from './lambda';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  url: true,
  ...(process.env.NODE_ENV === 'development' && {
    events: [
      {
        http: {
          method: 'post',
          path: '/{proxy+}',
        },
      },
      {
        http: {
          method: 'get',
          path: '/{proxy+}',
        },
      },
    ],
  }),
};
