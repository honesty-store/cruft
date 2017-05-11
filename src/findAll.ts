import { assertHasValidDynamoDBFieldNames } from './assertHasValidDynamoDBFieldNames';
import { IConfiguration, IHasVersion, IHasMetadata } from './index';

const createFilterExpression = (fieldNames, fields) =>
  fieldNames.reduce(
    (obj, key) => {
      obj[`:${key}`] = fields[key];
      return obj;
    },
    {}
  );

export const findAll = <T>({ client, tableName }: IConfiguration) =>
  async function*(fields: { [key: string]: string | number | boolean }): AsyncIterableIterator<T & IHasVersion & IHasMetadata> {
    assertHasValidDynamoDBFieldNames(fields);

    if ('id' in fields) {
      throw new Error('Use read rather than find if you know the id');
    }

    const fieldNames = Object.keys(fields);

    const filterExpression = fieldNames.length === 0
      ? null
      : fieldNames.map(key => `${key} = :${key}`)
        .join(' and ');

    const expressionAtributeValues = fieldNames.length === 0
      ? null
      : createFilterExpression(fieldNames, fields);

    let key = null;

    do {
      const response = await client.scan({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAtributeValues,
        ExclusiveStartKey: key,
        Limit: 100
      })
        .promise();

      for (const item of <Array<T & IHasVersion & IHasMetadata>>response.Items) {
        yield item;
      }

      key = response.LastEvaluatedKey;
    }
    while (key != null);
  };


// deprecated hack from before async iterators were supported
export const __findAll = <T>({ client, tableName }: IConfiguration) =>
  async (fields: { [key: string]: string | number | boolean }): Promise<Array<T & IHasVersion & IHasMetadata>> => {

    let result: Array<T & IHasVersion & IHasMetadata> = [];

    for await (const item of findAll<T>({ client, tableName })(fields)) {
      result.push(item);
    }

    return result;
  };