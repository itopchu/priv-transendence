import { NestMiddleware, UnauthorizedException, Injectable } from "@nestjs/common";
import { verify, JwtPayload } from "jsonwebtoken";
import { ConfigService } from "@nestjs/config";
import { UserService } from "../user/user.service";
import { UserSocket } from '../user/user.gateway';

@Injectable()
export class WSAuthGuard implements NestMiddleware {
  constructor(
    private configService: ConfigService,
    private userService: UserService,
  ) { }

  async use(client: UserSocket, next: Function) {
    const cookies = client.handshake.headers.cookie.split(';');
    let token = '';

    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token') {
        token = value;
        break;
      }
    }

    if (!token) {
      client.disconnect(true);
      return next(new UnauthorizedException('Unauthorized'));
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = verify(token, this.configService.get<string>('SECRET_KEY')) as JwtPayload;
    } catch (error) {
      client.disconnect(true);
      return next(new UnauthorizedException('Unauthorized'));
    }

    // Check decoded type and intraId
    if (typeof decoded !== 'object' || !decoded.intraId || isNaN(Number(decoded.intraId))) {
      client.disconnect(true);
      return next(new UnauthorizedException('Unauthorized'));
    }

    // Find user
    const user = await this.userService.getUserByIntraId(Number(decoded.intraId));
    if (!user) {
      client.disconnect(true);
      return next(new UnauthorizedException('Unauthorized'));
    }
    client.authUser = user;
    next();
  }
}