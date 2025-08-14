import { handlers } from "./handlers";

interface AutomationContext {
  [key: string]: any;
}

export async function ejecutarNodo(
  nodoId: string,
  nodesMap: Record<string, any>,
  context: any
): Promise<void> {
  const nodo = nodesMap[nodoId];
  if (!nodo) {
    console.warn(`⚠️ Nodo no encontrado: ${nodoId}`);
    return;
  }

  if (nodo.type === "trigger") {
    const siguientes = nodo.next || [];
    for (const nextId of siguientes) {
      await ejecutarNodo(nextId, nodesMap, context);
    }
    return;
  }

  const handler = handlers[nodo.type];
  if (!handler) {
    console.warn(`⚠️ Tipo de nodo no soportado: ${nodo.type}`);
    return;
  }

  const resultado = await handler(nodo, context);

  let siguientes: string[] = [];

  if (nodo.type === "condition") {
    siguientes = resultado ? nodo.trueNext || [] : nodo.falseNext || [];
  } else {
    siguientes = nodo.next || [];
  }

  for (const siguienteId of siguientes) {
    await ejecutarNodo(siguienteId, nodesMap, context);
  }
}
