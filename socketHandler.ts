import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import redisClient from './dbConfig/redisDbConfig';

export function setupSocketHandlers(io: Server) {
    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log("Socket.io Redis adapter initialized");
    });

    io.on('connection', (socket: Socket) => {
        console.log(`Socket connected: ${socket.id}`);

        socket.on('join-meeting', (meetingId: string) => {
            socket.join(meetingId);
            console.log(`Socket ${socket.id} joined meeting: ${meetingId}`);
        });

        // React Flow: Mindmap changes
        socket.on('mindmap-change', ({ meetingId, changes, type }: { meetingId: string, changes: any[], type: 'nodes' | 'edges' }) => {
            socket.to(meetingId).emit('mindmap-update', { changes, type, senderId: socket.id });
        });

        // React Flow: Sticky Notes changes
        socket.on('sticky-notes-change', ({ meetingId, changes, type }: { meetingId: string, changes: any[], type: 'nodes' | 'edges' }) => {
            socket.to(meetingId).emit('sticky-notes-update', { changes, type, senderId: socket.id });
        });

        // Excalidraw: Elements changes (Smart Diff)
        socket.on('canvas-change', ({ meetingId, elements }: { meetingId: string, elements: any[] }) => {
            socket.to(meetingId).emit('canvas-update', { elements, senderId: socket.id });
        });

        // SWOT updates
        socket.on('swot-change', ({ meetingId, state }: { meetingId: string, state: any }) => {
            socket.to(meetingId).emit('swot-update', { state, senderId: socket.id });
        });

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
}
