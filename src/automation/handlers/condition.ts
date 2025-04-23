import _ from "lodash";

export default async function condition(
  nodo: any,
  context: any
): Promise<boolean> {
  for (const cond of nodo.conditions || []) {
    const value = _.get(context, cond.field);

    switch (cond.operator) {
      case "exists":
        if (value === undefined || value === null) return false;
        break;
      case "equals":
        if (value !== cond.value) return false;
        break;
      case "not_equals":
        if (value === cond.value) return false;
        break;
      case "gt":
        if (!(value > cond.value)) return false;
        break;
      case "lt":
        if (!(value < cond.value)) return false;
        break;
    }
  }
  return true;
}
