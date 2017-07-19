import chai, { expect } from 'chai';
import dirtyChai from 'dirty-chai';
import fetchMock from 'fetch-mock';
import { flatten } from 'lodash';
import sinonChai from 'sinon-chai';
import data, { getValues } from '../data';

import {
  baseURL,
  buildQueryString,
  cachemapOptions,
  mockGet,
  path,
  productArgs,
  setupDelete,
  setupDeleteAll,
  setupGet,
  setupGetAll,
  setupPost,
  sortValues,
} from '../helpers';

import Getta from '../../src';

chai.use(dirtyChai);
chai.use(sinonChai);
process.env.WEB_ENV = true;

describe('when the Getta class is initialised', () => {
  describe('when "baseURL" is pased in as an argument', () => {
    it('should create an instance of the Geta rest client with the default options', () => {
      const getta = new Getta({ baseURL, cachemapOptions });
      expect(getta).to.be.instanceOf(Getta);
    });
  });

  describe('when "baseURL" is not pased in as an argument', () => {
    it('should throw the error: baseURL is a mandatory property for a rest client', () => {
      const initializer = () => new Getta({ newInstance: true });
      expect(initializer).to.throw(Error, 'baseURL is a mandatory property for a rest client.');
    });
  });

  describe('when "newInstance" is not passed in as an argument', () => {
    it('should return the same instance of the Getta class', () => {
      const getta = new Getta({ baseURL, cachemapOptions, newInstance: true });
      const instance = new Getta({ baseURL, cachemapOptions });
      expect(getta).to.eql(instance);
    });
  });

  describe('when "true" is passed in as the "newInstance" argument', () => {
    it('should return the same instance of the Getta class', () => {
      const getta = new Getta({ baseURL, cachemapOptions });
      const instance = new Getta({ baseURL, cachemapOptions, newInstance: true });
      expect(getta).not.to.eql(instance);
    });
  });
});

describe('the .get() method', () => {
  describe('when one resource is requested from the server', () => {
    let getta, res;
    const resource = '136-7317';

    before(() => {
      const setup = setupGet({ resource });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    beforeEach(async () => {
      res = await getta.get(productArgs(resource));
    });

    afterEach(async () => {
      await getta._cache.clear();
    });

    it('should return the requested data', () => {
      expect(res[0]).to.eql(data[resource].body);
    });

    it('should cache the data against the endpoint', async () => {
      expect(await getta._cache.size()).to.eql(1);
      const entry = await getta._cache.get(`${path}/${resource}`);
      expect(entry).to.eql(data[resource].body);
    });
  });

  describe('when one resource is requested from the server using a shortcut', () => {
    let getta, res;
    const queryParams = { format: 'standard' };
    const resource = '136-7317';

    before(() => {
      const setup = setupGet({ queryParams, resource });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    beforeEach(async () => {
      res = await getta.getProduct({ resource });
    });

    afterEach(async () => {
      await getta._cache.clear();
    });

    it('should return the requested data', () => {
      expect(res[0]).to.eql(data[resource].body);
    });

    it('should cache the data against the endpoint', async () => {
      expect(await getta._cache.size()).to.eql(1);
      const entry = await getta._cache.get(`${path}/${resource}${buildQueryString(queryParams)}`);
      expect(entry).to.eql(data[resource].body);
    });
  });

  describe('when one requested resource is in the cache', () => {
    describe('when the cached resource is valid', () => {
      let getta, res, urls;
      const resource = '136-7317';

      before(async () => {
        const setup = setupGet({ resource });
        getta = setup.getta;
        urls = setup.urls;
        await getta.getProduct({ resource });
      });

      after(async () => {
        fetchMock.restore();
        await getta._cache.clear();
      });

      beforeEach(async () => {
        fetchMock.reset();
        res = await getta.getProduct({ resource });
      });

      it('should return the requested data', () => {
        expect(res[0]).to.eql(data[resource].body);
      });

      it('should not have fetched the data from the server', async () => {
        expect(fetchMock.called(urls[0])).to.be.false();
      });
    });

    describe('when the cached resource is expired and server returns not modified header', () => {
      let getta, res;
      const resource = '136-7317';

      before(async () => {
        const etag = '33a64df551425fcc55e4d42a148795d9f25f89d4';
        const notModifiedHeaders = { 'cache-control': 'public, no-cache, max-age=6000', etag };
        const headers = { ...notModifiedHeaders, ...{ 'content-type': 'application/json' } };

        const matcher = (url, opts) => {
          if (!opts.headers) return false;
          return opts.headers.get('if-none-match') === etag;
        };

        fetchMock.mock(
          matcher,
          { headers: notModifiedHeaders, status: 304 },
          { headers: { 'if-none-match': etag } },
        );

        const setup = setupGet({ headers, resource });
        getta = setup.getta;
        await getta.getProduct({ resource });
      });

      after(async () => {
        fetchMock.restore();
      });

      beforeEach(async () => {
        res = await getta.getProduct({ resource });
      });

      it('should return the requested data from the cache', () => {
        expect(res[0]).to.eql(data[resource].body);
      });
    });

    describe('when the cached resource is expired and server returns new resource', () => {
      let getta;
      const resource = '136-7317';

      before(async () => {
        const etag = '33a64df551425fcc55e4d42a148795d9f25f89d4';

        const modifiedHeaders = {
          'cache-control': 'public, no-cache, max-age=10000',
          'content-type': 'application/json',
          etag,
        };

        const headers = {
          'cache-control': 'public, no-cache, max-age=6000',
          'content-type': 'application/json',
          etag,
        };

        const matcher = (url, opts) => {
          if (!opts.headers) return false;
          return opts.headers.get('if-none-match') === etag;
        };

        fetchMock.mock(
          matcher,
          { body: data[resource].body, headers: modifiedHeaders, status: 200 },
          { headers: { 'if-none-match': etag } },
        );

        const setup = setupGet({ headers, resource });
        getta = setup.getta;
      });

      after(async () => {
        fetchMock.restore();
      });

      beforeEach(async () => {
        await getta.getProduct({ resource });
      });

      afterEach(async () => {
        await getta._cache.clear();
      });

      it('should return the requested data', async () => {
        const res = await getta.getProduct({ resource });
        expect(res[0]).to.eql(data[resource].body);
      });

      it('should update the entry in the cache', async () => {
        expect(await getta._cache.size()).to.eql(1);
        let cacheability = await getta._cache.has(`${path}/${resource}`);
        expect(cacheability.maxAge).to.eql(6000);
        await getta.getProduct({ resource });
        expect(await getta._cache.size()).to.eql(1);
        cacheability = await getta._cache.has(`${path}/${resource}`);
        expect(cacheability.maxAge).to.eql(10000);
      });
    });
  });

  describe('when the server returns a 404 for a requested resource', () => {
    // TODO:...
  });

  describe('when batched resources are requested from the server', () => {
    let getta, res;
    const resource = ['136-7317', '180-1387', '183-3905', '202-3315'];
    const batchOne = ['136-7317', '180-1387'];
    const batchTwo = ['183-3905', '202-3315'];

    before(() => {
      mockGet({ batch: true, resource: batchOne });
      const setup = setupGet({ batch: true, resource: batchTwo });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    beforeEach(async () => {
      res = await getta.getProduct({ resource, options: { batchLimit: 2 } });
    });

    afterEach(async () => {
      await getta._cache.clear();
    });

    it('should return the requested data', () => {
      expect(res).to.eql(getValues());
    });

    it('should cache each resource set against its respective endpoint', async () => {
      expect(await getta._cache.size()).to.eql(2);
      const promises = [];
      promises.push(getta._cache.get(`${path}/${batchOne.join()}`));
      promises.push(getta._cache.get(`${path}/${batchTwo.join()}`));
      const entries = await Promise.all(promises);
      expect(flatten(entries).sort(sortValues)).to.eql(getValues());
    });
  });

  describe('when batched requested resources are returned from the server and cache', () => {
    let getta, res, urls;
    const resource = ['136-7317', '180-1387', '183-3905', '202-3315'];
    const batchOne = ['136-7317', '180-1387'];
    const batchTwo = ['183-3905', '202-3315'];

    before(() => {
      urls = mockGet({ batch: true, resource: batchOne });
      const setup = setupGet({ batch: true, resource: batchTwo });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    beforeEach(async () => {
      await getta.getProduct({ resource: batchOne });
      fetchMock.reset();
    });

    afterEach(async () => {
      await getta._cache.clear();
      fetchMock.reset();
    });

    it('should return the requested data', async () => {
      res = await getta.getProduct({ resource, options: { batchLimit: 2 } });
      expect(res.sort(sortValues)).to.eql(getValues());
    });

    it('should cache each data resource set against its respective endpoint', async () => {
      expect(await getta._cache.size()).to.eql(1);
      await getta.getProduct({ resource, options: { batchLimit: 2 } });
      expect(await getta._cache.size()).to.eql(2);
      const promises = [];
      promises.push(getta._cache.get(`${path}/${batchOne.join()}`));
      promises.push(getta._cache.get(`${path}/${batchTwo.join()}`));
      const entries = await Promise.all(promises);
      expect(flatten(entries).sort(sortValues)).to.eql(getValues());
    });

    it('should not have fetched the batchOne data from the server', async () => {
      await getta.getProduct({ resource, options: { batchLimit: 2 } });
      expect(fetchMock.called(urls[0])).to.be.false();
    });
  });

  describe('when separate resources are batched and requested from the server', () => {
    let getta, res;
    const resource = ['136-7317', '180-1387', '183-3905', '202-3315'];

    before(() => {
      const setup = setupGet({ batch: true, resource });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    beforeEach(async () => {
      const promises = [];

      resource.forEach((value) => {
        promises.push(getta.getProduct({ resource: value }));
      });

      res = flatten(await Promise.all(promises));
    });

    afterEach(async () => {
      await getta._cache.clear();
    });

    it('should return the requested data', async () => {
      expect(res.sort(sortValues)).to.eql(getValues());
    });

    it('should cache the data resource set against its endpoint', async () => {
      expect(await getta._cache.size()).to.eql(1);
      const entry = await getta._cache.get(`${path}/${resource.join()}`);
      expect(entry.sort(sortValues)).to.eql(getValues());
    });
  });

  describe('when all resources are requested from the server', () => {
    let getta, res;
    const resource = ['136-7317', '180-1387', '183-3905', '202-3315'];

    before(() => {
      const setup = setupGetAll({ resource });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    beforeEach(async () => {
      res = await getta.getProduct();
    });

    afterEach(async () => {
      await getta._cache.clear();
    });

    it('should return the requested data', async () => {
      expect(res.sort(sortValues)).to.eql(getValues());
    });

    it('should cache the resource data set against its endpoint', async () => {
      expect(await getta._cache.size()).to.eql(1);
      const entry = await getta._cache.get(`${path}`);
      expect(entry.sort(sortValues)).to.eql(getValues());
    });
  });
});

describe('the .post() method', () => {
  describe('when one resource is created and returned from the server', () => {
    let getta;
    const resource = '136-7317';

    before(() => {
      const setup = setupPost({ resource });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    it('should return the created data', async () => {
      const res = await getta.postProduct({ body: { id: resource } });
      expect(res[0]).to.eql(data[resource].body);
    });
  });
});

describe('the .delete() method', () => {
  describe('when one resource is requested to be deleted on the server', () => {
    let getta;
    const resource = '136-7317';

    before(() => {
      const setup = setupDelete({ resource });
      getta = setup.getta;
    });

    after(async () => {
      fetchMock.restore();
    });

    it('should return the deleted data', async () => {
      const res = await getta.deleteProduct({ resource });
      expect(res[0]).to.eql(data[resource].body);
    });
  });

  describe('when batched resources are requested to be deleted on the server', () => {
    let getta;
    const resource = ['136-7317', '180-1387', '183-3905', '202-3315'];

    before(() => {
      const setup = setupDelete({ batch: true, resource });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    it('should return the deleted data', async () => {
      const res = await getta.deleteProduct({ resource });
      expect(res.sort(sortValues)).to.eql(getValues());
    });
  });

  describe('when all resources are requested to be deleted on the server', () => {
    let getta;
    const resource = ['136-7317', '180-1387', '183-3905', '202-3315'];

    before(() => {
      const setup = setupDeleteAll({ resource });
      getta = setup.getta;
    });

    after(() => {
      fetchMock.restore();
    });

    it('should return the deleted data', async () => {
      const res = await getta.deleteProduct();
      expect(res.sort(sortValues)).to.eql(getValues());
    });
  });
});
