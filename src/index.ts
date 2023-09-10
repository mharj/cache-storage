let localCacheStore: CacheStorage | undefined;

/**
 * Set alternative cache store (e.g. mockup for testing)
 */
export function setCacheStorage(storage: CacheStorage) {
	localCacheStore = storage;
}

function haveBrowserCacheStorage(): boolean {
	return !!(typeof window !== 'undefined' && window.caches);
}

/**
 * Check if we have any cache store instance available
 */
export function haveCacheStorage(): boolean {
	return haveBrowserCacheStorage() || !!localCacheStore;
}

function getCacheStorage(): CacheStorage | undefined {
	// istanbul ignore next
	if (typeof window !== 'undefined' && window.caches) {
		return window.caches;
	}
	// use alternative cache store if no window.caches
	return localCacheStore;
}

function getCacheOptions({ignoreMethod, ignoreSearch, ignoreVary}: CacheQueryOptions = {}): CacheQueryOptions {
	return {ignoreMethod, ignoreSearch, ignoreVary};
}

/**
 * build Reuqest from RequestInfo | URL
 */
function buildRequest(request: RequestInfo | URL) {
	if (request instanceof Request) {
		return request;
	}
	return new Request(request);
}

/**
 * - if ```{ifNoneMatch: true}``` is set, we are passing ETag value from cache response to the request 'if-none-match' header for data validation.
 * - if ```{ifMatch: true}``` is set, we are passing ETag value from cache response to the request 'if-match' header for data validation.
 */
export type CacheOptions = {ifNoneMatch?: boolean; ifMatch?: boolean};

function handleCacheHeaders(req: Request, res: Response, {ifNoneMatch, ifMatch}: CacheOptions = {}) {
	if (ifNoneMatch) {
		const etag = res.headers.get('ETag');
		if (etag) {
			req.headers.set('if-none-match', etag);
		}
	}
	if (ifMatch) {
		const etag = res.headers.get('ETag');
		if (etag) {
			req.headers.set('if-match', etag);
		}
	}
}

/**
 * Try to return a response from cache
 * - if ```{ifNoneMatch: true}``` is set, we are passing ETag value from cache response to the request 'if-none-match' header for data validation.
 * - if ```{ifMatch: true}``` is set, we are passing ETag value from cache response to the request 'if-match' header for data validation.
 * @param {Request} req RequestInfo | URL to match
 * @param {CacheOptions & CacheQueryOptions} options optional CacheQueryOptions and CacheOptions
 * @param {string=} cacheName name of the cache to match (default: 'default')
 * @returns Response or undefined
 * @example
 * const req = new Request('http://localhost:3000/api/v1/health');
 * const cacheRes = await cacheMatch(req, {ifNoneMatch: true}); // ifNoneMatch: 'if-none-match' header from cached response ETag
 * const res = await fetch(req);
 * if (res.status === 304) { // 304 Not Modified
 *   // use cached response
 */
export async function cacheMatch(request: RequestInfo | URL, options?: CacheOptions & CacheQueryOptions, cacheName = 'default'): Promise<Response | undefined> {
	const storage = getCacheStorage();
	if (storage) {
		const req = buildRequest(request);
		const cache = await storage.open(cacheName);
		const resp = await cache.match(req, getCacheOptions(options));
		if (resp) {
			handleCacheHeaders(req, resp, options);
		}
		return resp;
	}
	return undefined;
}

/**
 * Store response in cache if response is ok (2xx status codes)
 * - if Authorization header is set, we are removing it from the request before storing it in cache
 * @param req RequestInfo | URL to store
 * @param res Response to store
 * @param cacheName name of the cache to store (default: 'default')
 * @example
 * const req = new Request('http://localhost:3000/api/v1/health');
 * const res = await fetch(req);
 * await cacheStore(req, res); // store response if response is ok (2xx status codes)
 */
export async function cacheStore(request: RequestInfo | URL, res: Response, cacheName = 'default'): Promise<void> {
	const storage = getCacheStorage();
	if (storage && res.ok) {
		const req = buildRequest(request);
		const cache = await storage.open(cacheName);
		// clone response to be able to use it twice
		const clonedRes = res.clone();
		clonedRes.headers.delete('Authorization'); // remove Authorization header from cache
		return cache.put(req, clonedRes);
	}
}

/**
 * Clean cache by baseUrl and list of urls to keep in cache
 * @param basePath start of url to clean
 * @param excludeUrls list of full urls to keep in cache
 * @param cacheName name of cache to clean (default: 'default')
 * @example
 * const bingImageList: string[] = await getBingImageUrlList();
 * await cacheCleanup('https://bing.com/th', bingImageList);
 */
export async function cacheCleanup(request: RequestInfo | URL, excludeUrls: string[], cacheName = 'default'): Promise<number> {
	let count = 0;
	const storage = getCacheStorage();
	if (storage) {
		const req = buildRequest(request);
		const cache = await storage.open(cacheName);
		const notFound = (await cache.keys()).filter((res) => res.url.startsWith(req.url) && excludeUrls.indexOf(res.url) === -1);
		for (const req of notFound) {
			if (await cache.delete(req)) {
				count++;
			}
		}
	}
	return count;
}

/**
 * delete cache store by name
 * @param cacheName name of the cache to delete (default: 'default')
 * @returns boolean if cache was deleted or 'no-storage' if no cache storage is available
 */
export async function cacheDelete(cacheName = 'default'): Promise<boolean | 'no-storage'> {
	const storage = getCacheStorage();
	if (storage) {
		return await storage.delete(cacheName);
	}
	return 'no-storage';
}

async function getDateHeader(resPromise: Response | undefined | Promise<Response | undefined>): Promise<Date | undefined> {
	const res = await resPromise;
	// istanbul ignore next
	if (!res) {
		return undefined;
	}
	const dateString = res.headers.get('date');
	if (dateString) {
		return new Date(dateString);
	}
	// istanbul ignore next
	return undefined;
}

/**
 * Delete old requests from cache based on Response header 'date'
 * @param timestamp delete older requests than this Date timestamp
 * @param cacheName name of the cache to delete (default: 'default')
 * @returns number of deleted requests
 */
export async function deleteOldRequests(timestamp: Date, cacheName = 'default'): Promise<number> {
	let count = 0;
	const storage = getCacheStorage();
	if (storage) {
		const ts = timestamp.getTime();
		const cache = await storage.open(cacheName);
		const keys = await cache.keys();
		for (const req of keys) {
			const date = await getDateHeader(cache.match(req));
			if (date && ts < date.getTime() && (await cache.delete(req))) {
				count++;
			}
		}
	}
	return count;
}
