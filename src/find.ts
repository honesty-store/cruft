import { assertHasValidDynamoDBFieldNames } from './assertHasValidDynamoDBFieldNames';
import { IConfiguration, IHasVersion, IHasMetadata } from './index';

export const find = <T>({ client, tableName }: IConfiguration) =>
  async (fields: { [key: string]: string | number | boolean }): Promise<T & IHasVersion & IHasMetadata> => {
    assertHasValidDynamoDBFieldNames(fields);

    if ('id' in fields) {
      throw new Error('Use read rather than find if you know the id');
    }

    const fieldNames = Object.keys(fields);

    const filterExpression = fieldNames.map(key => `${key} = :${key}`)
      .join(' and ');

    const expressionAtributeValues = fieldNames.reduce(
      (obj, key) => {
        obj[`:${key}`] = fields[key];
        return obj;
      },
      {}
    );

    const response = await client.scan({
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAtributeValues
    })
      .promise();

    if (response.Items.length === 0) {
      throw new Error('No value found');
    }

    if (response.Items.length > 1) {
      throw new Error('Multiple values found');
    }

    return <T & IHasVersion & IHasMetadata>response.Items[0];
  };
