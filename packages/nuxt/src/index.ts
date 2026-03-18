export type { HandlerOptions } from "@bunny-upload/handler";

import { defineEventHandler, toWebRequest, sendWebResponse } from "h3";

type Handler = (request: Request) => Promise<Response>;

export function defineBunnyUploadHandler(handler: Handler) {
  return defineEventHandler(async (event) => {
    const request = toWebRequest(event);
    const response = await handler(request);
    return sendWebResponse(event, response);
  });
}
