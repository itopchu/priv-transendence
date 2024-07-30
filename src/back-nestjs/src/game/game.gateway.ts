import { SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway(Number(process.env.PORT_WEBSOCKET), {cors: {origin: '*'}})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private rooms: Map<string, string[]> = new Map(); // roomId -> [player1, player2]

  constructor(private readonly gameService: GameService) {}

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
    setInterval(() => {
      this.rooms.forEach((players, roomId) => {
        this.server.to(roomId).emit('state', this.gameService.getGameState(roomId));
      });
    }, 16); // yaklaşık 60 FPS

    setInterval(() => {
      console.log(this.rooms.has('1'));
    }, 1000);
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.rooms.forEach((players, roomId) => {
      if (players.includes(client.id)) {
        this.rooms.set(roomId, players.filter(player => player !== client.id));
        // if (this.rooms.get(roomId).length === 0) {
        // }
        this.rooms.delete(roomId);
      }
    });
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, []);
    }
    const players = this.rooms.get(roomId);
    if (players.length < 2) {
      players.push(client.id);
      client.join(roomId);
      if (players.length === 2) {
        this.server.to(roomId).emit('startGame', roomId);
      }
    } else {
      client.emit('roomFull', roomId);
    }
  }

  @SubscribeMessage('move')
  handleMove(client: Socket, payload: { roomId: string, player: string, y: number }): void {
    this.gameService.updatePlayerPosition(payload.roomId, payload.player, payload.y);
    this.server.to(payload.roomId).emit('state', this.gameService.getGameState(payload.roomId));
    console.log(this.rooms.has(payload.roomId));
  }
}