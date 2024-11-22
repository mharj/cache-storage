/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable sort-imports */
import {beforeAll, describe, expect, it} from 'vitest';
import {setCacheStorage, haveCacheStorage, cacheStore, cacheCleanup, cacheMatch, cacheDelete, deleteOldRequests} from '../src/';
import {MockupCacheStore} from './lib/mockupCache';

const req = new Request('https://example.com/one');
req.headers.set('Authorization', '123');
const reqTwo = new Request('https://example.com/two');

const res = new Response('Hello World');
res.headers.set('ETag', '1234567890');
res.headers.set('Date', 'Mon, 01 Jan 2001 00:00:00 GMT');

describe('cache-storage', () => {
	describe('no cache store', () => {
		it('should check haveCaches', function () {
			expect(haveCacheStorage()).to.equal(false);
		});
		it('should store Response', async function () {
			await expect(cacheStore(req, res)).resolves.toBe(undefined);
			await expect(cacheStore(reqTwo, res)).resolves.toBe(undefined);
		});
		it('should get Response', async function () {
			await expect(cacheMatch(req)).resolves.toBe(undefined);
		});
		it('should get Response and add if-none-match', async function () {
			await expect(cacheMatch(req, {ifNoneMatch: true})).resolves.toBe(undefined);
			expect(req.headers.get('if-none-match')).to.be.eq(null);
		});
		it('should get Response and add if-match', async function () {
			await expect(cacheMatch(req, {ifMatch: true})).resolves.toBe(undefined);
			expect(req.headers.get('if-match')).to.be.eq(null);
		});
		it('should clean cache', async function () {
			await expect(cacheCleanup(new Request('https://example.com'), ['/two'])).resolves.toBe(0);
			await expect(cacheMatch(reqTwo)).resolves.toBe(undefined);
		});
		it('should delete old', async function () {
			await expect(deleteOldRequests(new Date('Mon, 01 Jan 2002 00:00:00 GMT'))).resolves.toBe(0);
			await expect(deleteOldRequests(new Date('Mon, 01 Jan 2000 00:00:00 GMT'))).resolves.toBe(0);
		});
		it('should delete cache', async function () {
			await expect(cacheDelete()).resolves.toBe('no-storage');
		});
	});
	describe('mock cache store', () => {
		beforeAll(() => {
			setCacheStorage(new MockupCacheStore());
		});
		it('should check haveCaches', function () {
			expect(haveCacheStorage()).to.equal(true);
		});
		it('should store Response', async function () {
			await expect(cacheStore(req, res)).resolves.toBe(undefined);
			await expect(cacheStore(reqTwo, res)).resolves.toBe(undefined);
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
			await expect(cacheCleanup(new Request('https://example.com'), ['https://example.com/two'])).resolves.toBe(1);
			await expect(cacheMatch(req)).resolves.toBe(undefined);
			const cacheRes = await cacheMatch(reqTwo);
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
		});
		it('should delete old', async function () {
			await expect(deleteOldRequests(new Date('Mon, 01 Jan 2002 00:00:00 GMT'))).resolves.toBe(0);
			await expect(deleteOldRequests(new Date('Mon, 01 Jan 2000 00:00:00 GMT'))).resolves.toBe(1);
		});
		it('should delete cache', async function () {
			await expect(cacheDelete()).resolves.toBe(true);
		});
	});
	describe('mock cache store url string', () => {
		beforeAll(() => {
			setCacheStorage(new MockupCacheStore());
		});
		it('should check haveCaches', function () {
			expect(haveCacheStorage()).to.equal(true);
		});
		it('should store Response', async function () {
			await expect(cacheStore('https://example.com/one', res)).resolves.toBe(undefined);
			await expect(cacheStore('https://example.com/two', res)).resolves.toBe(undefined);
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
			await expect(cacheCleanup(new Request('https://example.com'), ['https://example.com/two'])).resolves.toBe(1);
			await expect(cacheMatch(req)).resolves.toBe(undefined);
			const cacheRes = await cacheMatch('https://example.com/two');
			expect(cacheRes?.url).to.be.eq(res.url);
			expect(cacheRes?.status).to.be.eq(res.status);
			expect(cacheRes?.statusText).to.be.eq(res.statusText);
		});
		it('should delete old', async function () {
			await expect(deleteOldRequests(new Date('Mon, 01 Jan 2002 00:00:00 GMT'))).resolves.toBe(0);
			await expect(deleteOldRequests(new Date('Mon, 01 Jan 2000 00:00:00 GMT'))).resolves.toBe(1);
		});
		it('should delete cache', async function () {
			await expect(cacheDelete()).resolves.toBe(true);
		});
	});
});
