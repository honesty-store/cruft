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

// hack to retrieve all items until 2.3 arrives with support for async iterators
// https://github.com/Microsoft/TypeScript/pull/12346
export const __findAll = <T>({ client, tableName }: IConfiguration) =>
  async (fields: { [key: string]: string | number | boolean }): Promise<Array<T & IHasVersion & IHasMetadata>> => {
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

    let result: Array<T & IHasVersion & IHasMetadata> = [];
    let key = null;

    do {
      const response = await client.scan({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAtributeValues,
        ExclusiveStartKey: key
      })
        .promise();

      result.push(...<Array<T & IHasVersion & IHasMetadata>>response.Items);
      key = response.LastEvaluatedKey;
    }
    while (key != null);

    return result;
  };
