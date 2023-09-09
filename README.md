# @mharj/cache-storage

## Installation

```bash
npm install @mharj/cache-storage
```

## API documentation

https://mharj.github.io/cache-storage/

## Usage example with ETags and server side cache validation

```typescript
function fetchHealth(): Promise<unknown> {
	const req = new Request('http://localhost:3000/api/v1/health');
	const cacheRes = await cacheMatch(req, {ifNoneMatch: true}); // attach ETag header to request
	const res = await fetch(req);
	await cacheStore(req, res); // stores response if response is ok (2xx status codes)
    // not changed (304 code), we can still use cached response for data
	if (cacheRes && res.status === 304) {
		return cacheRes.json();
	}
	if (!res.ok) { // 3xx, 4xx, 5xx status codes
		throw new Error('Network response was not ok');
	}
	return res.json();
}
```
