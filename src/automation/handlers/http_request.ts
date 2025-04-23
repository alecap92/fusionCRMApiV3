import axios from "axios";
import handlebars from "handlebars";

export default async function httpRequest(nodo: any, context: any) {
  const url = handlebars.compile(nodo.url || "")(context);
  const body = JSON.parse(
    handlebars.compile(JSON.stringify(nodo.body || {}))(context)
  );
  const headers = nodo.headers || {};
  const method = nodo.method || "POST";

  console.log(`🌐 HTTP ${method} ➝ ${url}`);
  console.log("Payload:", body);

  await axios({ method, url, headers, data: body });
}
