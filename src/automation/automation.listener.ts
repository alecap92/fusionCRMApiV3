import AutomationModel from "../models/AutomationModel";
import { ejecutarNodo } from "./automation.service";
import { EventEmitter } from "events";

export const eventEmitter = new EventEmitter(); // Idealmente se mueve a utils/events.ts

eventEmitter.on("deals.status_changed", async (payload) => {
  try {
    const automations = await AutomationModel.find({ isActive: true });

    for (const automation of automations) {
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
        const match = Object.entries(triggerNode.payloadMatch || {}).every(
          ([key, val]) => {
            const match = payload[key]?.toString() === val?.toString();
            return match;
          }
        );

        if (match) {
          await ejecutarNodo(triggerNode.id, nodesMap, payload);
        }
      } else {
        console.log("⚠️ Nodo 1 no es trigger válido. Saltando.");
      }
    }
  } catch (error) {
    console.error("❌ Error ejecutando automatización:", error);
  }
});
