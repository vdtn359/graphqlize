import { SchemaComposer } from 'graphql-compose';

export const buildUnion = (composer: SchemaComposer) => {
  composer.getOrCreateUTC(
    'union StringNumberFilter = StringFilter | NumberFilter'
  );
};
