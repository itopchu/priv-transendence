import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

interface Player {
  userId: number;
  clientId: string;
  position: boolean;
}

@WebSocketGateway(Number(process.env.PORT_WEBSOCKET), { cors: { origin: '*' } })
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private rooms: Map<string, Player[]> = new Map();

  constructor(private readonly gameService: GameService) {}

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
    setInterval(() => {
      this.rooms.forEach((players, roomId) => {
        this.server.to(roomId).emit('state', this.gameService.getGameState(roomId));
      });
    }, 16);

    setInterval(() => {
      this.rooms.forEach((players, roomId) => {
        const room = this.rooms.get(roomId);
        if (room) {
          console.log(`Room ${roomId} has ${room.length} players: ${room.join(', ')}`);
        } else {
          console.log(`Room ${roomId} does not exist`);
        }
      });
    }, 5000);
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.rooms.forEach((players, roomId) => {
      const index = players.findIndex(player => player.clientId === client.id); //eleme yapilacak
    });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, { roomId, userId }: { roomId: string, userId: number }): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, []);
    }
    const players = this.rooms.get(roomId);
    if (players && !players.some(player=> player.userId === userId)) {
      const position = players.length === 0;
      players.push({ userId, clientId: client.id, position});
      this.rooms.set(roomId, players);
    }
    client.join(roomId);
    console.log(`Client ${userId} joined room ${roomId}`);
  }
  
  @SubscribeMessage('move')
  handleMove(client: Socket, payload: { roomId: string, userId: number, y: number }): void {
    
    
    const room = this.rooms.get(payload.roomId);
    if (room) {
      const player = room.find(player => player.userId === payload.userId);
      if (player) {
        const position = player.position;
        this.gameService.updatePlayerPosition(payload.roomId, position, payload.y);
        this.server.to(payload.roomId).emit('state', this.gameService.getGameState(payload.roomId));
      }
    }
  }
}