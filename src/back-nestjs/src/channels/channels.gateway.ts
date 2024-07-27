import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(5000, { cors: { origin: "*" } })
export class ChannelsGateway {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`connected ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`disconnected ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: string) {
    this.server.emit('message', "domates");
    console.log(data);
  }
}
