import {
  gatewayJsonResponse,
  gatewayPreflightResponse,
  originRejectionResponse,
} from "@/lib/server/domains/gateway/cors";
import { handleAiChatPost } from "@/lib/server/domains/ai-chat/service";

const CORS_METHODS = "POST,OPTIONS";

export async function OPTIONS(request: Request) {
  return gatewayPreflightResponse({
    request,
    methods: CORS_METHODS,
  });
}

export async function POST(request: Request) {
  const rejection = originRejectionResponse({ request });
  if (rejection) {
    return rejection;
  }

  const result = await handleAiChatPost(request);
  return gatewayJsonResponse({
    request,
    methods: CORS_METHODS,
    body: result.body,
    status: result.status,
  });
}
