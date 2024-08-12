import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verify, JwtPayload } from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { UnauthorizedException } from '@nestjs/common';
import { User } from '../entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { UserPublicDTO } from '../dto/user.dto';

export interface UserSocket extends Socket {
  authUser?: User;
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

@WebSocketGateway(Number(process.env.PORT_WEBSOCKET), { namespace: 'user', cors: { origin: process.env.ORIGIN_URL_FRONT, credentials: true } })
export class UserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private readonly userService: UserService,
    private readonly configService: ConfigService) { }

  @WebSocketServer()
  server: Server;

  public connectedUsers: Map<number, number> = new Map();

  async handleConnection(client: UserSocket) {
    let user: User;
    try {
      user = await authenticateUser(client, this.configService, this.userService);
    } catch (error) {
      client.disconnect(true);
      console.log(error.message);
      return false;
    }
    client.join(String(user.id));
    const userStatus = this.connectedUsers.get(user.id) | 0
    this.connectedUsers.set(user.id, userStatus + 1);
    this.emitStatus(user);
    return (true);
  }

  handleDisconnect(client: UserSocket) {
    const user = client.authUser;
    if (user) {
      const rooms = Array.from(client.rooms);
      rooms.forEach(room => {
        client.leave(room);
      });

      const oldValue = this.connectedUsers.get(user.id) | 0;
      if (oldValue > 2) {
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
}