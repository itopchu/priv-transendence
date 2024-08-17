import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verify, JwtPayload } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { UserPublicDTO } from '../dto/user.dto';
import { GameService } from '../game/game.service';

export interface UserSocket extends Socket {
  authUser?: User;
}

interface Player {
  userId: number;
  clientId: string;
  roomId: string;
  position: boolean;
}

export async function authenticateUser(
  client: UserSocket,
  configService: ConfigService,
  userService: UserService,
): Promise<User> {
  const cookies = client.handshake.headers.cookie?.split(';') || [];
  let token = '';
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'auth_token') {
      token = value;
      break;
    }
  }
  if (!token) {
    throw new UnauthorizedException('Unauthorized: No token provided');
  }

  try {
    const decoded = verify(token, configService.get<string>('SECRET_KEY')) as JwtPayload;
    if (typeof decoded !== 'object' || !decoded.intraId || isNaN(Number(decoded.intraId))) {
      throw new UnauthorizedException('Unauthorized: Invalid token structure');
    }

    const user = await userService.getUserByIntraId(Number(decoded.intraId));
    if (!user) {
      throw new UnauthorizedException('Unauthorized: User not found');
    }
    client.authUser = user;
    console.log('User Authenticated');
    return user;
  } catch (error) {
    throw new UnauthorizedException('Unauthorized: Invalid token');
  }
}

@WebSocketGateway(Number(process.env.PORT_WEBSOCKET), { cors: { origin: process.env.ORIGIN_URL_FRONT, credentials: true } })
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly gameService: GameService) { }

  @WebSocketServer()
  server: Server;

  public connectedUsers: Map<number, number> = new Map();

  async handleConnection(client: UserSocket) {
    let user: User;
    try {
      user = await authenticateUser(client, this.configService, this.userService);
      console.log('Client connected:', user.nameFirst, client.id);//kontrol icin
    } catch (error) {
      client.disconnect(true);
      console.log(error.message);
      return false;
    }
    const userStatus = this.connectedUsers.get(user.id) | 0
    this.connectedUsers.set(user.id, userStatus + 1);
    this.emitStatus(user);
    return (true);
  }

  handleDisconnect(client: UserSocket) {
    const user = client.authUser;
    console.log('Client disconnected:', user?.nameFirst, client.id);//kontrol icin
    if (user) {
      const rooms = Array.from(client.rooms);
      rooms.forEach(room => {
        client.leave(room);
      });

      const oldValue = this.connectedUsers.get(user.id) | 0;
      if (oldValue >= 2) {
        this.connectedUsers.set(user.id, oldValue - 1);
      } else {
        this.connectedUsers.delete(user.id);
        this.server.to(String(user.id)).emit('profileStatus', new UserPublicDTO(user, 'offline'));
      }
    }
  }

  @SubscribeMessage('profileStatus')
  async handleProfileStatus(client: UserSocket, payload: number, callback: Function) {
    console.log('handleProfileStatus called with payload:', payload);
    const user = await this.userService.getUserById(payload);
    if (!user) {
      console.log('User not found for payload:', payload);
      client.emit('profileError', 'User not Found');
      return;
    }
    client.join(String(user.id));
    this.emitStatus(user);
  }

  @SubscribeMessage('unsubscribeProfileStatus')
  async handleProfileStatusUnsubscribe(client: UserSocket, payload: number) {
    const user = await this.userService.getUserById(payload);
    if (!user) {
      throw new UnauthorizedException('Unauthorized: User not found');
    }
    client.leave(String(user.id));
  }

  public emitStatus(user: User) {
    const userStatus = this.connectedUsers.get(user.id) | 0
    if (userStatus === 0)
      this.server.to(String(user.id)).emit('profileStatus', new UserPublicDTO(user, 'offline'))
    else if (userStatus > 0) {
      this.server.to(String(user.id)).emit('profileStatus', new UserPublicDTO(user, 'online'))
    }
  }


  //game
  //game
  //game
  //game
  //game
  //game
  //game
  //game
  private rooms: Map<string, Player[]> = new Map();
  private queue: { qUserId: number, client: Socket }[] = [];

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
    setInterval(() => {
      this.rooms.forEach((players, roomId) => {
        this.server.to(roomId).emit('state', this.gameService.getGameState(roomId));
      });
    }, 16);
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(client: Socket, userId: number): void {
    if (this.queue.some(player => player.qUserId === userId)) {
      return (console.log('User already in queue', userId));
    }

    this.queue.push({ qUserId: userId, client });
    if (this.queue.length >= 2) {
      const player1 = this.queue.shift();
      const player2 = this.queue.shift();
      
      if (player1 && player2) {
        const roomId = `room-${Date.now()}`;
        this.rooms.set(roomId, [
          { userId: player1.qUserId, clientId: player1.client.id, roomId: roomId, position: true },
          { userId: player2.qUserId, clientId: player2.client.id, roomId: roomId, position: false }
        ]);
        
        player1.client.join(roomId);
        player2.client.join(roomId);
        
        this.server.to(roomId).emit('startGame', roomId);
      }
    }
  }

  @SubscribeMessage('getRoomId')
  handleGetRoomId(client: Socket, userId: number): string | null {
    for (const [roomId, players] of this.rooms) {
      const player = players.find(player => player.userId === userId);
      if (player) {
        player.clientId = client.id;
        client.join(roomId);
        console.log('player:', userId, roomId);
        return roomId;
      }
    }
    return null;
  }

  /*   @SubscribeMessage('joinRoom')
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
  } */

  @SubscribeMessage('move')
  handleMove(client: Socket, payload: { userId: number, y: number, roomId: string }): void {
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

  @SubscribeMessage('info')
  changeSpeed(client: Socket): void {
    this.rooms.forEach((players, roomId) => {
      console.log(`Room ${roomId} has ${players.length} players: ${players.map(player => player.userId).join(' - ')}`);
    });
  }
}