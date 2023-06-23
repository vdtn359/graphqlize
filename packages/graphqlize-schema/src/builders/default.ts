import { SchemaComposer } from 'graphql-compose';
import { SchemaOptionType } from './options';
import { pluralizeTransform, singular, transform } from '../utils';

export class DefaultBuilder {
  protected composer: SchemaComposer;

  protected options: SchemaOptionType;

  constructor({
    composer,
    options,
  }: {
    composer: SchemaComposer;
    options: SchemaOptionType;
  }) {
    this.composer = composer;
    this.options = options;
  }

  protected typeName(name: string, plural = false) {
    if (plural) {
      return pluralizeTransform(name, this.options.case);
    }
    return transform(singular(name), this.options.case);
  }
}
