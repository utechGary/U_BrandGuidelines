import { handler } from "../../../lib/mcp";

// Streamable HTTP: mcp-handler serves POST natively; GET/DELETE answer 405 (stateless).
export { handler as GET, handler as POST, handler as DELETE };
