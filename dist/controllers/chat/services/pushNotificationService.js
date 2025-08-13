"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = void 0;
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo({ useFcmV1: true });
const sendNotification = (toTokens_1, _a) => __awaiter(void 0, [toTokens_1, _a], void 0, function* (toTokens, { title, body, data, }) {
    const areExpoTokens = toTokens.every((token) => expo_server_sdk_1.Expo.isExpoPushToken(token));
    if (!areExpoTokens) {
        throw new Error("Invalid Expo push token");
    }
    const messages = toTokens.map((token) => ({
        to: token,
        sound: "default",
        body: body,
        title: title,
        data: data,
    }));
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    for (let chunk of chunks) {
        try {
            const ticketChunk = yield expo.sendPushNotificationsAsync(chunk);
            tickets.push(ticketChunk);
        }
        catch (error) {
            console.error("Error sending push notification chunks", error);
            throw new Error("Error sending push notification");
        }
    }
    return { done: true };
});
exports.sendNotification = sendNotification;
