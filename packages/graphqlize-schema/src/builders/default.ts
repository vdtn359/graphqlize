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
    const casing =
      this.options.case === 'camelCase' ? 'pascalCase' : this.options.case;
    if (plural) {
      return pluralizeTransform(name, casing);
    }
    return transform(singular(name), casing);
  }

  protected columnName(name: string) {
    return transform(name, this.options.case);
  }
}
