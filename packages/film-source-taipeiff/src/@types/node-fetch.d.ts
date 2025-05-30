declare module 'node-fetch' {
  const fetch: typeof globalThis.fetch;
  export default fetch;
  export class Response extends globalThis.Response {
    // Add any missing methods/properties from node-fetch Response
  }
  export class Request extends globalThis.Request {}
  export class Headers extends globalThis.Headers {}
}