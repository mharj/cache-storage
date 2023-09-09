/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable no-unused-expressions */
/* eslint-disable sort-imports */
import 'mocha';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import {setCacheStorage, haveCacheStorage, cacheStore, cacheCleanup, cacheMatch, cacheDelete} from '../src/';
import {MockupCacheStore} from './lib/mockupCache';

const req = new Request('https://example.com/one');
const reqTwo = new Request('https://example.com/two');
const res = new Response('Hello World');
res.headers.set('ETag', '1234567890');

chai.use(chaiAsPromised);
const expect = chai.expect;

describe('cache-storage', () => {
	describe('no cache store', () => {
		it('should check haveCaches', async function () {
			expect(haveCacheStorage()).to.equal(false);
		});
		it('should store Response', async function () {
			await expect(cacheStore(req, res)).to.be.eventually.undefined;
			await expect(cacheStore(reqTwo, res)).to.be.eventually.undefined;
		});
		it('should get Response', async function () {
			await expect(cacheMatch(req)).to.be.eventually.undefined;
		});
		it('should get Response and add if-none-match', async function () {
			await expect(cacheMatch(req, {ifNoneMatch: true})).to.be.eventually.undefined;
			expect(req.headers.get('if-none-match')).to.be.null;
		});
		it('should get Response and add if-match', async function () {
			await expect(cacheMatch(req, {ifMatch: true})).to.be.eventually.undefined;
			expect(req.headers.get('if-match')).to.be.null;
		});
		it('should clean cache', async function () {
			await expect(cacheCleanup('https://example.com', ['/two'])).to.be.eventually.undefined;
			await expect(cacheMatch(reqTwo)).to.be.eventually.undefined;
		});
		it('should delete cache', async function () {
			await expect(cacheDelete()).to.be.eventually.undefined;
		});
	});
	describe('mock cache store', () => {
		before(() => {
			setCacheStorage(new MockupCacheStore());
		});
		it('should check haveCaches', async function () {
			expect(haveCacheStorage()).to.equal(true);
		});
		it('should store Response', async function () {
			await expect(cacheStore(req, res)).to.be.eventually.undefined;
			await expect(cacheStore(reqTwo, res)).to.be.eventually.undefined;
		});
		it('should get Response', async function () {
			const cacheRes = await cacheMatch(req);
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
		});
		it('should get Response and add if-none-match', async function () {
			const cacheRes = await cacheMatch(req, {ifNoneMatch: true});
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
			expect(req.headers.get('if-none-match')).to.be.eq('1234567890');
		});
		it('should get Response and add if-match', async function () {
			const cacheRes = await cacheMatch(req, {ifMatch: true});
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
			expect(req.headers.get('if-match')).to.be.eq('1234567890');
		});
		it('should clean cache', async function () {
			await expect(cacheCleanup('https://example.com', ['https://example.com/two'])).to.be.eventually.undefined;
			await expect(cacheMatch(req)).to.be.eventually.undefined;
			const cacheRes = await cacheMatch(reqTwo);
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
		});
		it('should delete cache', async function () {
			await expect(cacheDelete()).to.be.eventually.undefined;
		});
	});
	describe('mock cache store url string', () => {
		before(() => {
			setCacheStorage(new MockupCacheStore());
		});
		it('should check haveCaches', async function () {
			expect(haveCacheStorage()).to.equal(true);
		});
		it('should store Response', async function () {
			await expect(cacheStore('https://example.com/one', res)).to.be.eventually.undefined;
			await expect(cacheStore('https://example.com/two', res)).to.be.eventually.undefined;
		});
		it('should get Response', async function () {
			const cacheRes = await cacheMatch(req);
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
		});
		it('should get Response and add if-none-match', async function () {
			const cacheRes = await cacheMatch('https://example.com/one', {ifNoneMatch: true});
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
			expect(req.headers.get('if-none-match')).to.be.eq('1234567890');
		});
		it('should get Response and add if-match', async function () {
			const cacheRes = await cacheMatch('https://example.com/one', {ifMatch: true});
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
			expect(req.headers.get('if-match')).to.be.eq('1234567890');
		});
		it('should clean cache', async function () {
			await expect(cacheCleanup('https://example.com', ['https://example.com/two'])).to.be.eventually.undefined;
			await expect(cacheMatch(req)).to.be.eventually.undefined;
			const cacheRes = await cacheMatch('https://example.com/two');
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
		});
		it('should delete cache', async function () {
			await expect(cacheDelete()).to.be.eventually.undefined;
		});
	});
});
