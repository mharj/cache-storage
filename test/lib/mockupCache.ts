type RequestKey = Record<Request['method'], {req: Request; res: Response | undefined}>;

type InteralCache = Record<string, RequestKey>;

export class MockupCache implements Cache {
	private cache: InteralCache = {};

	public add(request: RequestInfo | URL): Promise<void> {
		const req = this.buildRequest(request);
		return Promise.resolve(this.handleAdd(req));
	}

	private handleAdd(req: Request, res?: Response) {
		const entry = this.cache[req.url];
		if (!entry) {
			this.cache[req.url] = {
				[req.method]: {
					req,
					res,
				},
			};
		} else {
			entry[req.method] = {
				req,
				res,
			};
		}
	}

	private handleDelete(req: Request, _options: CacheQueryOptions): boolean {
		const entry = this.cache[req.url];
		if (!entry) {
			return false;
		}
		delete entry[req.method];
		if (Object.keys(entry).length === 0) {
			delete this.cache[req.url];
		}
		return true;
	}

	public addAll(requests: Iterable<RequestInfo>): Promise<void> {
		Array.from(requests).forEach((request) => {
			this.handleAdd(this.buildRequest(request));
		});
		return Promise.resolve();
	}

	public async delete(request: RequestInfo | URL, options?: CacheQueryOptions): Promise<boolean> {
		const req = this.buildRequest(request);
		return Promise.resolve(this.handleDelete(req, options || {}));
	}

	private handleReqKeyRequestList(keyObject: RequestKey, _options: CacheQueryOptions): Request[] {
		return Object.values(keyObject).map((value) => value.req);
	}

	public keys(request?: RequestInfo | URL, options?: CacheQueryOptions): Promise<readonly Request[]> {
		if (request) {
			const req = this.buildRequest(request);
			const keyObject = this.cache[req.url];
			if (!keyObject) {
				return Promise.resolve([]);
			}
			return Promise.resolve(this.handleReqKeyRequestList(keyObject, options || {}));
		}
		return Promise.resolve(
			Object.values(this.cache).reduce<Request[]>((acc, curr) => {
				return acc.concat(this.handleReqKeyRequestList(curr, options || {}));
			}, []),
		);
	}

	public match(request: RequestInfo | URL, _options?: CacheQueryOptions): Promise<Response | undefined> {
		const req = this.buildRequest(request);
		const entry = this.cache[req.url];
		if (!entry) {
			return Promise.resolve(undefined);
		}
		return Promise.resolve(entry[req.method]?.res);
	}

	private getResponsesFromEntry(entry: RequestKey): Response[] {
		return Object.values(entry)
			.map((value) => value.res)
			.filter((res) => res !== undefined);
	}

	public matchAll(request?: RequestInfo | URL, _options?: CacheQueryOptions): Promise<readonly Response[]> {
		if (request) {
			const req = this.buildRequest(request);
			const entry = this.cache[req.url];
			if (!entry) {
				return Promise.resolve([]);
			}
			return Promise.resolve(this.getResponsesFromEntry(entry));
		}
		return Promise.resolve(
			Object.values(this.cache).reduce<Response[]>((acc, curr) => {
				return acc.concat(this.getResponsesFromEntry(curr));
			}, []),
		);
	}

	public put(request: RequestInfo | URL, response: Response): Promise<void> {
		const req = this.buildRequest(request);
		this.handleAdd(req, response);
		return Promise.resolve();
	}

	private buildRequest(request: RequestInfo | URL) {
		if (request instanceof Request) {
			return request;
		}
		return new Request(request);
	}
}

export class MockupCacheStore implements CacheStorage {
	private cacheStore = new Map<string, Cache>();
	public delete(cacheName: string): Promise<boolean> {
		return Promise.resolve(this.cacheStore.delete(cacheName));
	}

	public has(cacheName: string): Promise<boolean> {
		return Promise.resolve(this.cacheStore.has(cacheName));
	}

	public keys(): Promise<string[]> {
		return Promise.resolve(Array.from(this.cacheStore.keys()));
	}

	public async match(request: RequestInfo | URL, options?: MultiCacheQueryOptions): Promise<Response | undefined> {
		if (options?.cacheName) {
			const cache = this.cacheStore.get(options.cacheName);
			if (cache) {
				return cache.match(request, options);
			}
		}
		for (const cache of Array.from(this.cacheStore.values())) {
			const res = await cache.match(request, options);
			if (res) {
				return res;
			}
		}
		return undefined;
	}

	public open(cacheName: string): Promise<Cache> {
		let cache = this.cacheStore.get(cacheName);
		if (!cache) {
			cache = new MockupCache();
			this.cacheStore.set(cacheName, cache);
		}
		return Promise.resolve(cache);
	}
}
