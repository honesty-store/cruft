import { assertHasValidDynamoDBFieldNames } from './assertHasValidDynamoDBFieldNames';
import { IConfiguration, IHasId, IHasVersion, IHasMetadata } from './index';

export const update = <T>({ client, tableName }: IConfiguration) =>
  async (item: T & IHasId & IHasVersion): Promise<T & IHasVersion & IHasMetadata> => {
    assertHasValidDynamoDBFieldNames(item);

    // hack - can't use object rest/spread with types yet - Microsoft/TypeScript/issues/10727
    const updatedItem = Object.assign({}, item, {
      version: item.version + 1,
      modified: Date.now()
    });

    const fieldNames = Object.keys(updatedItem)
      .filter(key => key !== 'id')
      .filter(key => key !== 'created');

    const updateExpression = fieldNames.map(key => `#${key}=:${key}`)
      .join(', ');

    const updateExpressionAttributeNames = fieldNames.reduce(
      (obj, key) => {
        obj[`#${key}`] = key;
        return obj;
      },
      {}
    );

    const updateExpressionAttributeValues = fieldNames.reduce(
      (obj, key) => {
        obj[`:${key}`] = updatedItem[key];
        return obj;
      },
      {}
    );

    const conditionAttributeValues = {
      ':previousVersion': item.version
    };

    const expressionAttributeValues = Object.assign({}, updateExpressionAttributeValues, conditionAttributeValues);

    let response = null;
    try {
      response = await client.update({
        TableName: tableName,
        Key: {
          id: item.id
        },
        ConditionExpression: 'version = :previousVersion',
        UpdateExpression: `set ${updateExpression}`,
        ExpressionAttributeNames: updateExpressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      })
        .promise();
    }
    catch (e) {
      if (e.code !== 'ConditionalCheckFailedException') {
        throw e;
      }
      throw new Error(`Item is out of date`);
    }
    return <T & IHasVersion & IHasMetadata>response.Attributes;
  };