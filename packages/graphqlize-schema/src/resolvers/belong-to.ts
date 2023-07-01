import type {
  DatabaseMapper,
  ForeignKeyMetadata,
} from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { hasColumns } from '../utils';

export class BelongToResolver extends DefaultResolver {
  private mapper: DatabaseMapper;

  private foreignKey: ForeignKeyMetadata;

  constructor({
    mapper,
    tableBuilder,
    foreignKey,
  }: {
    mapper: DatabaseMapper;
    tableBuilder: TableBuilder;
    foreignKey: ForeignKeyMetadata;
  }) {
    super(tableBuilder);
    this.mapper = mapper;
    this.foreignKey = foreignKey;
  }

  async resolve(parent: any) {
    const { referenceTable, columns, referenceColumns } = this.foreignKey;

    if (!hasColumns(parent?.$raw ?? {}, columns)) {
      return null;
    }
    const schemaBuilder = this.tableBuilder.getSchemaBuilder();
    const translator = this.tableBuilder.getTranslator();
    const referencedTableBuilder =
      schemaBuilder.getTableBuilder(referenceTable);
    const referencedTableRepository = referencedTableBuilder.getRepository();

    const result = await referencedTableRepository.loadOne(
      referenceColumns,
      referenceColumns.reduce(
        (agg, referenceColumn, currentIndex) => ({
          ...agg,
          [referenceColumn]: parent.$raw[columns[currentIndex]],
        }),
        {}
      )
    );
    return translator.convertFromDB(result);
  }
}
