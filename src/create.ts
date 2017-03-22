import { assertHasValidDynamoDBFieldNames } from './assertHasValidDynamoDBFieldNames';
import { IConfiguration, IHasVersion, IHasMetadata } from './index';

export const create = <T>({ client, tableName }: IConfiguration) =>
  async (item: T): Promise<T & IHasVersion & IHasMetadata> => {
    assertHasValidDynamoDBFieldNames(item);

    // hack - can't use object rest/spread with types yet - Microsoft/TypeScript/issues/10727
    const itemWithMetadata = Object.assign({}, item, {
      version: 0,
      created: Date.now(),
      modified: Date.now()
    });

    try {
      await client.put({
        TableName: tableName,
        Item: itemWithMetadata,
        ConditionExpression: 'attribute_not_exists(id)'
      })
        .promise();
    }
    catch (e) {
      if (e.code !== 'ConditionalCheckFailedException') {
        throw e;
      }
      throw new Error(`Item already exists`);
    }

    return itemWithMetadata;
  };