import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Tipos
export type SocketIOInstance = SocketIOServer;

interface UserData {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  [key: string]: any; // Para campos adicionales
}

interface SocketWithUser extends Socket {
  data: {
    user: UserData;
  };
}

// Configuración
const CONFIG = {
  JWT_SECRET: process.env.SECRET_KEY as string,
  CORS: {
    origin: "*", // En producción, considera limitar esto a orígenes específicos
    methods: ["GET", "POST"],
    credentials: true,
  },
  EVENTS: {
    JOIN_ROOM: "joinRoom",
    LEAVE_ROOM: "leaveRoom",
    DISCONNECT: "disconnect",
    NEW_NOTIFICATION: "newNotification",
    NEW_MESSAGE: "newMessage",
  },
  ROOM_PREFIX: {
    ORGANIZATION: "organization_",
    USER: "user_",
    DEAL: "deal_",
  },
};

// Validar configuración
if (!CONFIG.JWT_SECRET) {
  throw new Error("SECRET_KEY no está definido en las variables de entorno");
}

// Singleton para la instancia de Socket.IO
let io: SocketIOInstance | null = null;

/**
 * Gestiona la autenticación del socket
 * @param socket Socket a autenticar
 * @returns Booleano indicando si la autenticación fue exitosa
 */
const authenticateSocket = (socket: Socket): boolean => {
  try {
    const token = socket.handshake.auth.token;

    if (!token || typeof token !== "string") {
      console.warn(
        "Socket auth failed: No token provided or invalid token format"
      );
      return false;
    }

    // Extraer el token del formato Bearer
    const tokenParts = token.split(" ");
    const tokenString = tokenParts.length > 1 ? tokenParts[1] : token;

    // Verificar el token
    const decoded = jwt.verify(tokenString, CONFIG.JWT_SECRET) as UserData;

    // Almacenar datos del usuario en el socket
    socket.data.user = decoded;

    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Socket auth failed: ${errorMessage}`);
    return false;
  }
};

/**
 * Gestiona las salas a las que se une el socket tras la autenticación
 * @param socket Socket autenticado
 */
const handleSocketRooms = (socket: SocketWithUser): void => {
  const { user } = socket.data;

  // Unir a sala de organización
  if (user.organizationId) {
    const orgRoom = `${CONFIG.ROOM_PREFIX.ORGANIZATION}${user.organizationId}`;
    socket.join(orgRoom);
    console.log(`Socket ${socket.id} joined room: ${orgRoom}`);
  }

  // Unir a sala personal
  const userRoom = `${CONFIG.ROOM_PREFIX.USER}${user.id}`;
  socket.join(userRoom);
  console.log(`Socket ${socket.id} joined room: ${userRoom}`);
};

/**
 * Configura los eventos del socket
 * @param socket Socket autenticado
 */
const setupSocketEvents = (socket: SocketWithUser): void => {
  // Evento de desconexión
  socket.on(CONFIG.EVENTS.DISCONNECT, () => {
    console.log(`Socket ${socket.id} disconnected`);
  });

  // Unirse a sala
  socket.on(CONFIG.EVENTS.JOIN_ROOM, (room: string) => {
    if (typeof room !== "string" || !room.trim()) {
      return;
    }

    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  // Salir de sala
  socket.on(CONFIG.EVENTS.LEAVE_ROOM, (room: string) => {
    if (typeof room !== "string" || !room.trim()) {
      return;
    }

    socket.leave(room);
    console.log(`Socket ${socket.id} left room: ${room}`);
  });
};

/**
 * Gestiona una nueva conexión de socket
 * @param socket Nuevo socket conectado
 */
const handleNewConnection = (socket: Socket): void => {
  console.log(`New socket connection: ${socket.id}`);

  // Autenticar el socket
  if (!authenticateSocket(socket)) {
    socket.disconnect();
    return;
  }

  // El socket ahora tiene datos de usuario
  const authenticatedSocket = socket as SocketWithUser;

  // Configurar salas
  handleSocketRooms(authenticatedSocket);

  // Configurar eventos
  setupSocketEvents(authenticatedSocket);
};

/**
 * Inicializa el servidor Socket.IO
 * @param server Servidor HTTP
 * @returns Instancia de Socket.IO
 */
export const initializeSocket = (server: HttpServer): SocketIOInstance => {
  if (io) {
    console.warn(
      "Socket.IO ya estaba inicializado, devolviendo instancia existente"
    );
    return io;
  }

  io = new SocketIOServer(server, {
    cors: CONFIG.CORS,
  });

  console.log("Socket.IO inicializado correctamente");

  // Configurar el evento de conexión
  io.on("connection", handleNewConnection);

  return io;
};

/**
 * Emite un evento a una sala específica
 * @param room Nombre de la sala
 * @param event Nombre del evento
 * @param data Datos a enviar
 */
export const emitToRoom = (room: string, event: string, data: any): void => {
  const socketInstance = getSocketInstance();
  socketInstance.to(room).emit(event, data);
};

/**
 * Emite un evento a una organización específica
 * @param organizationId ID de la organización
 * @param event Nombre del evento
 * @param data Datos a enviar
 */
export const emitToOrganization = (
  organizationId: string,
  event: string,
  data: any
): void => {
  const room = `${CONFIG.ROOM_PREFIX.ORGANIZATION}${organizationId}`;
  emitToRoom(room, event, data);
};

/**
 * Emite un evento a un usuario específico
 * @param userId ID del usuario
 * @param event Nombre del evento
 * @param data Datos a enviar
 */
export const emitToUser = (userId: string, event: string, data: any): void => {
  const room = `${CONFIG.ROOM_PREFIX.USER}${userId}`;
  emitToRoom(room, event, data);
};

/**
 * Obtiene la instancia de Socket.IO
 * @returns Instancia de Socket.IO
 * @throws Error si Socket.IO no está inicializado
 */
export const getSocketInstance = (): SocketIOInstance => {
  if (!io) {
    throw new Error(
      "Socket.IO no está inicializado, llama a initializeSocket primero"
    );
  }
  return io;
};

/**
 * Cierra la conexión de Socket.IO
 */
export const closeSocketConnection = (): void => {
  if (io) {
    io.disconnectSockets(true);
    io.close();
    io = null;
    console.log("Socket.IO cerrado correctamente");
  }
};

// Exportar constantes útiles
export const SOCKET_EVENTS = CONFIG.EVENTS;
export const SOCKET_ROOMS = CONFIG.ROOM_PREFIX;
