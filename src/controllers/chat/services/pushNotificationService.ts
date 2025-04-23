import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo({ useFcmV1: true });

export const sendNotification = async (toTokens: string[], {title, body}:{title:string, body:string}) => {
    const areExpoTokens = toTokens.every(token => Expo.isExpoPushToken(token));
    if (!areExpoTokens) {
        throw new Error('Invalid Expo push token');
    }

    const messages: ExpoPushMessage[] = toTokens.map(token => ({
        to: token,
        sound: 'default',
        body: body,
        title: title,
    }));

    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];

    for (let chunk of chunks) {
        try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(ticketChunk);
        } catch (error) {
            console.error('Error sending push notification chunks', error);
            throw new Error('Error sending push notification');
        }
    }

    return { done: true };
};
