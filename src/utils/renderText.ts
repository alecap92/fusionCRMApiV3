import handlebars from "handlebars";

export function renderText(template: string, context: any): string {
  const compiled = handlebars.compile(template || "");
  return compiled(context);
}
