import { SchemaComposer } from 'graphql-compose';
import pluralize from 'pluralize';
import { SchemaOptionType } from './options';
import {
  mergeTransform,
  pluralizeTransform,
  singular,
  transform,
} from '../utils';

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

  getTypeNameCasing(): SchemaOptionType['case'] {
    return this.options.case === 'camelCase'
      ? ('pascalCase' as const)
      : this.options.case;
  }

  protected typeName(name: string, plural = false) {
    const casing = this.getTypeNameCasing();
    const singularName = transform(singular(name), casing);
    if (plural) {
      const pluralName = pluralizeTransform(name, casing);
      if (pluralName === singularName) {
        return mergeTransform([singularName, 'List'], casing);
      }
    }
    return singularName;
  }

  columnName(name: string, plural = false) {
    const transformedName = name
      .split('__')
      .map((part) => transform(part, this.options.case))
      .join('__');

    return plural ? pluralize(transformedName) : transformedName;
  }
}
