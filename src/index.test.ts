import { DynamoDB } from 'aws-sdk';
import { expect } from 'chai';
import index, { ICruft } from './index';

interface IFoo {
  id: string;
  [key: string]: any;
}

describe('cruft', () => {

  let cruft: ICruft<IFoo>;
  let db: DynamoDB;

  beforeEach(async () => {
    cruft = index<IFoo>({
      tableName: 'cruft-ddb'
    });
    db = new DynamoDB(<{ apiVersion: string, endpoint: string }>{
      apiVersion: '2012-08-10',
      endpoint: process.env.AWS_DYNAMODB_ENDPOINT
    });
    await db.createTable({
      AttributeDefinitions: [
        {
          AttributeName: 'id',
          AttributeType: 'S'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH'
        }
      ],
      TableName: 'cruft-ddb',
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    })
      .promise();
  });

  afterEach(async () => {
    await db.deleteTable({
      TableName: 'cruft-ddb'
    })
      .promise();
  });

  describe('create', () => {

    it('should create a new item', async () => {
      const item = await cruft.create({ id: 'foo', version: 0 });
      expect(item.id).to.equal('foo', 'Incorrect item id');
      expect(item.version).to.equal(0, 'Incorrect item version');
      expect(item.created).to.equal(item.modified, 'Incorrect timestamps');
    });

    it('should throw when creating an existing item', async () => {
      await cruft.create({ id: 'foo', version: 0 });
      try {
        await cruft.create({ id: 'foo', version: 0 });
        fail('Item already exists');
      } catch (e) {
        if (e.message !== 'Item already exists') {
          throw e;
        }
      }
    });

    it('should throw when creating an item with an invalid attribute name', async () => {
      try {
        await cruft.create({ id: 'foo', version: 0, 'uh oh': true });
        fail('Item has an invalid attribute name');
      } catch (e) {
        if (e.message !== 'Invalid field name specified uh oh') {
          throw e;
        }
      }
    });

  });

  describe('read', async () => {

    it('should read an item', async () => {
      await cruft.create({ id: 'foo', version: 0 });
      const item = await cruft.read({ id: 'foo' });
      expect(item.id).to.equal('foo', 'Incorrect item id');
      expect(item.version).to.equal(0, 'Incorrect item version');
      expect(item.created).to.equal(item.modified, 'Incorrect timestamps');
    });

  });

  describe('update', async () => {

    it('should update an item', async () => {
      const original = await cruft.create({ id: 'foo', version: 0, bar: 0 });
      const updated = await cruft.update({ id: 'foo', bar: 1, version: original.version });
      expect(original.id).to.equal(updated.id, 'Incorrect item id');
      expect(updated.version).to.equal(1, 'Incorrect item version');
      expect(original.created).to.equal(updated.created, 'Incorrect created timestamp');
      expect(updated.created).not.to.equal(updated.modified, 'Incorrect updated timestamp');
      expect(updated.bar).to.equal(1, 'Incorrect attribute value');
    });

    it('should update an item with a reserved attribute name', async () => {
      const original = await cruft.create({ id: 'foo', version: 0, count: 0 });
      const updated = await cruft.update({ id: 'foo', count: 1, version: original.version });
      expect(updated.count).to.equal(1, 'Incorrect attribute value');
    });

    it('should throw when updating an out of date item', async () => {
      const original = await cruft.create({ id: 'foo', version: 0, bar: 0 });
      await cruft.update({ id: 'foo', bar: 1, version: original.version });
      try {
        await cruft.update({ id: 'foo', bar: 1, version: original.version });
        fail('Item is out of date');
      } catch (e) {
        if (e.message !== 'Item is out of date') {
          throw e;
        }
      }
    });

    it('should throw when updating an item with an invalid attribute name', async () => {
      const item = await cruft.create({ id: 'foo', version: 0 });
      try {
        await cruft.update({ id: 'foo', version: item.version, 'uh oh': true });
        fail('Item has an invalid attribute name');
      } catch (e) {
        if (e.message !== 'Invalid field name specified uh oh') {
          throw e;
        }
      }
    });

  });

  describe('find', async () => {

    it('should find an item', async () => {
      await cruft.create({ id: 'foo', version: 0, bar: 4 });
      const item = await cruft.find({ bar: 4 });
      expect(item.id).to.equal('foo', 'Incorrect item');
    });

    it('should throw when finding an item by id', async () => {
      await cruft.create({ id: 'foo', version: 0 });
      try {
        await cruft.find({ id: 'foo' });
        fail('Find by id should not be supported');
      } catch (e) {
        if (e.message !== 'Use read rather than find if you know the id') {
          throw e;
        }
      }
    });

    it('should throw when finding an item with an invalid attribute name', async () => {
      try {
        await cruft.find({ 'uh oh': true });
        fail('Should throw error');
      } catch (e) {
        if (e.message !== 'Invalid field name specified uh oh') {
          throw e;
        }
      }
    });

  });

  describe('findAll', async () => {

    it('should find items without filter', async () => {
      await cruft.create({ id: 'foo', version: 0, bar: 4 });
      for await (const item of cruft.findAll({})) {
        expect(item.id).to.equal('foo');
      }
    });

    it('should find items over many pages', async () => {
      for (let i = 0; i < 250; i++) {
        await cruft.create({ id: String(i), version: 0, bar: 4 });
      }
      let i = 0;
      for await (const _item of cruft.findAll({})) {
        i++;
      }
      expect(i).to.equal(250, 'Incorrect item count');
    });

    it('should find items over many pages and stop if break called', async () => {
      for (let i = 0; i < 250; i++) {
        await cruft.create({ id: String(i), version: 0, bar: 4 });
      }
      let i = 0;
      for await (const _item of cruft.findAll({})) {
        if (++i === 150) {
          break;
        }
      }
      expect(i).to.equal(150, 'Incorrect item count');
    });

  });

  describe('__findAll', async () => {

    it('should find items without filter', async () => {
      await cruft.create({ id: 'foo', version: 0, bar: 4 });
      const items = await cruft.__findAll({});
      expect(items).to.lengthOf(1, 'Incorrect item count');
    });

    (<any>it)('should find items over many pages', async () => {
      for (let i = 0; i < 1000; i++) {
        await cruft.create({ id: String(i), version: 0, bar: 4 });
      }
      const items = await cruft.__findAll({ bar: 4 });
      expect(items).to.lengthOf(1000, 'Incorrect item count');
    }, 60000);

  });

  describe('truncate', () => {

    it('should truncate an item', async () => {
      await cruft.create({ id: 'foo', version: 0 });
      await cruft.truncate({ id: 'foo', version: 0 });
    });

    it('should throw when truncating an out of date item', async () => {
      const original = await cruft.create({ id: 'foo', version: 0, bar: 0 });
      await cruft.update({ id: 'foo', bar: 1, version: original.version });
      try {
        await cruft.truncate({ id: 'foo', version: original.version });
        fail('Item is out of date');
      } catch (e) {
        if (e.message !== 'Item is out of date') {
          throw e;
        }
      }
    });
  });

});
