// src/controllers/automation/nodeTypesController.ts
import { Request, Response } from "express";

/**
 * Definición de los tipos de nodos disponibles en el sistema
 */
const nodeTypes = [
  {
    type: "deals_trigger",
    label: "Deal Trigger",
    description: "Start when deal status changes",
    category: "trigger",
    inputs: [],
    outputs: [
      {
        name: "default",
        label: "Default Output",
        type: "any",
      },
    ],
  },
  {
    type: "whatsapp_trigger",
    label: "WhatsApp Trigger",
    description: "Start when a WhatsApp message is received",
    category: "trigger",
    inputs: [],
    outputs: [
      {
        name: "default",
        label: "Default Output",
        type: "any",
        description: "The received message",
      },
    ],
  },
  {
    type: "webhook_trigger",
    label: "Webhook Trigger",
    description: "Receive data from external services",
    category: "trigger",
    inputs: [],
    outputs: [
      {
        name: "default",
        label: "Default Output",
        type: "any",
      },
    ],
  },
  {
    type: "tasks_trigger",
    label: "Task Trigger",
    description: "Start when a task is created or updated",
    category: "trigger",
    inputs: [],
    outputs: [
      {
        name: "default",
        label: "Default Output",
        type: "any",
      },
    ],
  },

  {
    type: "chatgpt",
    label: "ChatGPT",
    description: "Interact with ChatGPT",
    category: "action",
    inputs: [
      {
        type: "string",
        name: "prompt",
        label: "Prompt",
        required: true,
        default: "What is the weather today?",
      },
    ],
  },
  {
    type: "contacts",
    label: "Contacts",
    description: "Manage contacts2",
    category: "action",
    inputs: [
      {
        type: "string",
        name: "action",
        label: "Action",
        required: true,
        default: "create",
        options: ["create", "update", "delete", "find"],
      },
      {
        type: "object",
        name: "contactData",
        label: "Contact Data",
        required: true,
        properties: {
          firstName: { type: "string", label: "First Name", required: true },
          lastName: { type: "string", label: "Last Name", required: true },
          email: { type: "string", label: "Email", required: true },
          phone: { type: "string", label: "Phone Number" },
          mobile: { type: "string", label: "Mobile Number" },
          company: { type: "string", label: "Company Name" },
          position: { type: "string", label: "Job Position" },
          address: { type: "string", label: "Address" },
          city: { type: "string", label: "City" },
          state: { type: "string", label: "State" },
          country: { type: "string", label: "Country" },
          postalCode: { type: "string", label: "Postal Code" },
          source: { type: "string", label: "Lead Source" },
          tags: { type: "array", label: "Tags" },
          customFields: { type: "object", label: "Custom Fields" },
        },
      },
      {
        type: "string",
        name: "contactId",
        label: "Contact ID",
        required: false,
        description: "Required for update and delete actions",
      },
    ],
    outputs: [
      {
        name: "contact",
        label: "Contact Data",
        type: "object",
        description: "The created or modified contact data",
      },
      {
        name: "error",
        label: "Error",
        type: "object",
        description: "Error information if the operation fails",
      },
    ],
  },
  {
    type: "http_request",
    label: "HTTP Request",
    description: "Make HTTP requests to external services",
    category: "action",
    inputs: [
      {
        type: "string",
        name: "method",
        label: "Method",
        required: true,
        default: "GET",
        options: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      },
      {
        type: "string",
        name: "url",
        label: "URL",
        required: true,
      },
      {
        type: "object",
        name: "headers",
        label: "Headers",
        required: false,
      },
      {
        type: "object",
        name: "body",
        label: "Body",
        required: false,
      },
    ],
    outputs: [
      {
        name: "response",
        label: "Response",
        type: "object",
      },
    ],
  },
  {
    type: "condition",
    label: "Condition",
    description: "Branch based on conditions",
    category: "condition",
    inputs: [
      {
        type: "string",
        name: "field",
        label: "Field",
        required: true,
      },
      {
        type: "string",
        name: "operator",
        label: "Operator",
        required: true,
        options: [
          "equals",
          "not_equals",
          "contains",
          "not_contains",
          "exists",
          "not_exists",
          "greater_than",
          "less_than",
        ],
      },
      {
        type: "any",
        name: "value",
        label: "Value",
        required: false,
      },
    ],
    outputs: [
      {
        name: "true",
        label: "If True",
        type: "any",
      },
      {
        name: "false",
        label: "If False",
        type: "any",
      },
    ],
  },
  {
    type: "send_email",
    label: "Send Email",
    description: "Send email notification",
    category: "action",
    inputs: [
      {
        type: "string",
        name: "to",
        label: "To",
        required: true,
      },
      {
        type: "string",
        name: "subject",
        label: "Subject",
        required: true,
      },
      {
        type: "string",
        name: "emailBody",
        label: "Email Body",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        label: "Result",
        type: "object",
      },
    ],
  },
  {
    type: "send_whatsapp",
    label: "Send WhatsApp",
    description: "Send WhatsApp message",
    category: "action",
    inputs: [
      {
        type: "string",
        name: "to",
        label: "To",
        required: true,
      },
      {
        type: "string",
        name: "message",
        label: "Message",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        label: "Result",
        type: "object",
      },
    ],
  },
  {
    type: "delay",
    label: "Delay",
    description: "Wait for specified time",
    category: "action",
    inputs: [
      {
        type: "string",
        name: "delayType",
        label: "Delay Type",
        required: true,
        default: "minutes",
        options: ["seconds", "minutes", "hours", "days"],
      },
      {
        type: "number",
        name: "duration",
        label: "Duration",
        required: true,
        default: 5,
      },
      {
        type: "boolean",
        name: "businessHours",
        label: "Business Hours Only",
        required: false,
        default: false,
      },
    ],
    outputs: [
      {
        name: "result",
        label: "Result",
        type: "object",
      },
    ],
  },
  {
    type: "transform",
    label: "Transform Data",
    description: "Transform data between steps",
    category: "action",
    inputs: [
      {
        type: "array",
        name: "transformations",
        label: "Transformations",
        required: true,
      },
    ],
    outputs: [
      {
        name: "result",
        label: "Result",
        type: "object",
      },
    ],
  },
];

/**
 * Obtener los tipos de nodos disponibles
 */
export const getNodeTypes = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ data: nodeTypes });
  } catch (error: any) {
    console.error("Error al obtener tipos de nodos:", error);
    return res.status(500).json({
      message: "Error al obtener tipos de nodos",
      error: error.message,
    });
  }
};

/**
 * Definición de los módulos y eventos disponibles
 */
const moduleEvents = [
  {},
  // {
  //   module: "deals",
  //   event: "created",
  //   description: "Triggered when a deal is created",
  //   payloadSchema: {
  //     dealId: "string",
  //     name: "string",
  //     amount: "number",
  //     contactId: "string",
  //     userId: "string",
  //   },
  // },
  // {
  //   module: "deals",
  //   event: "status_changed",
  //   description: "Triggered when a deal's status changes",
  //   payloadSchema: {
  //     dealId: "string",
  //     name: "string",
  //     fromStatus: "string",
  //     toStatus: "string",
  //     contactId: "string",
  //     userId: "string",
  //   },
  // },
  // {
  //   module: "tasks",
  //   event: "created",
  //   description: "Triggered when a task is created",
  //   payloadSchema: {
  //     taskId: "string",
  //     title: "string",
  //     description: "string",
  //     dueDate: "date",
  //     assigneeId: "string",
  //     creatorId: "string",
  //   },
  // },
];

/**
 * Obtener los módulos y eventos disponibles
 */
export const getAvailableModules = async (req: Request, res: Response) => {
  try {
    return res.status(200).json({ data: moduleEvents });
  } catch (error: any) {
    console.error("Error al obtener módulos y eventos:", error);
    return res.status(500).json({
      message: "Error al obtener módulos y eventos",
      error: error.message,
    });
  }
};
