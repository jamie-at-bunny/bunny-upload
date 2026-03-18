export type { HandlerOptions } from "@bunny.net/upload-handler";

type Handler = (request: Request) => Promise<Response>;

export function serveBunnyUpload(handler: Handler) {
  return {
    POST: async (request: Request) => {
      return handler(request);
    },
  };
}
