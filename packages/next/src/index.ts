export type { HandlerOptions } from "@bunny.net/upload-handler";

type Handler = (request: Request) => Promise<Response>;

export function serveBunnyUpload(handler: Handler) {
  return {
    POST: async (request: Request) => {
      return handler(request);
    },
  };
}

export function serveBunnyFileManager(handler: Handler) {
  return {
    GET: async (request: Request) => handler(request),
    POST: async (request: Request) => handler(request),
    PUT: async (request: Request) => handler(request),
    DELETE: async (request: Request) => handler(request),
  };
}
