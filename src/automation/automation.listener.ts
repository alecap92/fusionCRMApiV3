import AutomationModel from "../models/AutomationModel";
import { ejecutarNodo } from "./automation.service";
import { EventEmitter } from "events";

export const eventEmitter = new EventEmitter(); // Idealmente se mueve a utils/events.ts

eventEmitter.on("deals.status_changed", async (payload) => {
  console.log("🔔 Evento recibido: deals.status_changed");
  console.log("📦 Payload recibido:", payload);

  try {
    const automations = await AutomationModel.find({ isActive: true });
    console.log(
      `📋 Automatizaciones activas encontradas: ${automations.length}`
    );

    for (const automation of automations) {
      console.log(`➡️ Evaluando automatización: ${automation.name}`);

      const nodesMap = Object.fromEntries(
        automation.nodes.map((n) => [n.id, n])
      );
      const triggerNode = nodesMap["1"];

      if (!triggerNode) {
        console.warn("⚠️ Automatización sin nodo 1 (trigger). Saltando.");
        continue;
      }

      if (
        triggerNode.type === "trigger" &&
        triggerNode.module === "deals" &&
        triggerNode.event === "status_changed"
      ) {
        console.log("✅ Trigger válido. Verificando payloadMatch...");

        const match = Object.entries(triggerNode.payloadMatch || {}).every(
          ([key, val]) => {
            const match = payload[key]?.toString() === val?.toString();
            console.log(
              `🔍 Comparando payload[${key}] = ${payload[key]} con`,
              val,
              "→",
              match
            );
            return match;
          }
        );

        if (match) {
          console.log(`🚀 Disparando automatización: ${automation.name}`);
          await ejecutarNodo(triggerNode.id, nodesMap, payload);
        } else {
          console.log(
            `❌ No coincidió payloadMatch en automatización: ${automation.name}`
          );
        }
      } else {
        console.log("⚠️ Nodo 1 no es trigger válido. Saltando.");
      }
    }
  } catch (error) {
    console.error("❌ Error ejecutando automatización:", error);
  }
});
