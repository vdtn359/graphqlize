import type {
  DatabaseMapper,
  ForeignKeyMetadata,
} from '@vdtn359/graphqlize-mapper';
import type { TableBuilder } from '../builders/table';
import { DefaultResolver } from './default';
import { Repository } from './repository';

export class BelongToResolver extends DefaultResolver {
  private mapper: DatabaseMapper;

  private repository: Repository;

  private foreignKey: ForeignKeyMetadata;

  constructor({
    mapper,
    tableBuilder,
    repository,
    foreignKey,
  }: {
    mapper: DatabaseMapper;
    tableBuilder: TableBuilder;
    repository: Repository;
    foreignKey: ForeignKeyMetadata;
  }) {
    super(tableBuilder);
    this.mapper = mapper;
    this.repository = repository;
    this.foreignKey = foreignKey;
  }

  async resolve(parent: any) {
    // TODO: support foreign relationship with more than 1 keys
    const [column] = this.foreignKey.columns;
    const [referencedColumn] = this.foreignKey.referenceColumns;
    const { referenceTable } = this.foreignKey;

    if (!parent?.$raw?.[column]) {
      return null;
    }
    const schemaBuilder = this.tableBuilder.getSchemaBuilder();
    const referencedTableBuilder =
      schemaBuilder.getTableBuilder(referenceTable);
    const referencedTableRepository = referencedTableBuilder.getRepository();

    const result = await referencedTableRepository.loadOne([referencedColumn], {
      [referencedColumn]: parent.$raw[column],
    });
    return this.convertFromDB(result);
  }
}
