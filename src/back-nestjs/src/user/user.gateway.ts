import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verify, JwtPayload } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { UserPublicDTO } from '../dto/user.dto';
import { GameService } from './user.game.service';
import { subscribe } from 'diagnostics_channel';

export interface UserSocket extends Socket {
  authUser?: User;
}

export interface GameSocket extends UserSocket {
  roomId?: string;
  position?: boolean;
}

interface Player {
  userId: number;
  position: boolean;
  client: GameSocket;
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
    private readonly gameService: GameService) {}

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

  handleDisconnect(client: GameSocket) {
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
    if (client.roomId) {
      this.handlePauseGame(client);
      client.leave(client.roomId);
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
  private queue: { userId: number, client: GameSocket }[] = [];
  private timeId: Map<string, NodeJS.Timeout> = new Map();

  afterInit(server: Server) {
    console.log('WebSocket server initialized');
    setInterval(() => {
      this.rooms.forEach((players, roomId) => {
        this.server.to(roomId).emit('state', this.gameService.getGameState(roomId));
        // console.log('state', this.gameService.getGameState(roomId));
      });
    }, 16);
  }

  @SubscribeMessage('joinQueue')
  handleJoinQueue(client: GameSocket): void {
    if (client.roomId) {
      return console.log('User already in a room', client.authUser.id);
    }
    if (this.queue.some(player => player.userId === client.authUser.id)) {
      return console.log('User already in queue', client.authUser.id);
    }
  
    this.queue.push({ userId: client.authUser.id, client });
    if (this.queue.length < 2) return;
  
    const [player1, player2] = [this.queue.shift(), this.queue.shift()];
    if (!player1 || !player2) return;
  
    const roomId = `room-${Date.now()}`;
    this.rooms.set(roomId, [
      { userId: player1.userId, position: true, client: player1.client },
      { userId: player2.userId, position: false, client: player2.client },
    ]);
  
    [player1, player2].forEach((player, index) => {
      player.client.join(roomId);
      player.client.roomId = roomId;
      player.client.position = index === 0;
      player.client.emit('startGame', index === 0);
    });
  }

  @SubscribeMessage('getPlayerState')
  handleGetRoomId(client: GameSocket): number {
    const inQueue = this.queue.find(player => player.userId === client.authUser.id);
    if (inQueue) {
      inQueue.client = client;
      return 3;
    }
    for (const [roomId, players] of this.rooms) {
      const player = players.find(player => player.userId === client.authUser.id);
      if (player) {
        if (player.client.id !== client.id) {
          client.join(roomId);
          console.log('player:', client.authUser.nameFirst, roomId, player.position);
          client.roomId = roomId;
          client.position = player.position;
          player.client = client;
        }
        this.handleResumeGame(client);
        return player.position ? 1 : 2;
      }
    }
    return 0;
  }

  @SubscribeMessage('move')
  handleMove(client: GameSocket, direction: number): void {
    if (!client.roomId || client.position === undefined) return
    console.log('move', direction);
    this.gameService.updatePlayerPosition(client.roomId, client.position, direction);
    this.server.to(client.roomId).emit('state', this.gameService.getGameState(client.roomId));
  }

  @SubscribeMessage('info')
  changeSpeed(client: GameSocket): void {
    this.rooms.forEach((players, roomId) => {
      console.log(`Room ${roomId} has ${players.length} players: ${players.map(player => player.userId).join(' - ')}`);
    });
  }

  @SubscribeMessage('playWithBot')
  handlePlayWithBot(client: GameSocket): void {
    console.log('playWithBot', client.authUser.nameFirst);
    const roomId = `room-${Date.now()}`;
    this.rooms.set(roomId, [
      { userId: client.authUser.id, position: true, client },
    ]);
    this.gameService.getGameState(roomId).bot = true;
    client.join(roomId);
    client.roomId = roomId;
    client.position = true;
    client.emit('startGame', 1);
  }

  @SubscribeMessage('leaveGame')
  public handleLeaveGame(client: GameSocket): void {
    const roomId = client.roomId;
    if (!roomId) return;
    console.log('leave', client.authUser.nameFirst);
    this.rooms.get(roomId).forEach(player => {
      player.client.leave(roomId);
      player.client.roomId = undefined;
      player.client.position = undefined;
      if (player.client.authUser.id === client.authUser.id) {
        player.client.emit('gameOver', false);
      } else {
        player.client.emit('gameOver', true);
      }
      console.log('gameOver', player.client.authUser.nameFirst);
    });
    this.rooms.delete(roomId);
    this.gameService.deleteGame(roomId);
  }

  @SubscribeMessage('pauseGame')
  handlePauseGame(client: GameSocket): void {
    if (!client.roomId) return;
    if (this.timeId.get(client.roomId)) return;
    this.gameService.pauseGame(client.roomId);
    this.timeId.set(client.roomId, setTimeout(() => {this.handleLeaveGame(client)}, 10000));
    console.log('pause', client.id, this.timeId.get(client.roomId), client.roomId);
  }

  @SubscribeMessage('resumeGame')
  handleResumeGame(client: GameSocket): void {
    if (!client.roomId) return;
    const timeId = this.timeId.get(client.roomId);
    if (!timeId) return;
    console.log('resume', client.id, timeId, client.roomId);
    clearTimeout(timeId);
    this.timeId.delete(client.roomId);
    this.gameService.setGameInterval(client.roomId);
  }
}