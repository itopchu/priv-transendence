import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { UserGateway } from './user.gateway';

interface Player {
  y: number;
  direction: number;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface GameState {
  player1: Player;
  player2: Player;
  bot: boolean;
  ball: Ball;
  score: { player1: number, player2: number };
}

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  private gameStates: Map<string, GameState> = new Map(); // roomId -> gameState
  private intervalIds: Map<string, NodeJS.Timeout> = new Map(); // roomId -> intervalId
  private containerWidth = 800; // Örnek genişlik
  private containerHeight = 500; // Örnek yükseklik
  private paddleSpeed = 5; // Örnek hız

  onModuleInit() {
    // Başlangıçta herhangi bir oyun odası yok
  }

  onModuleDestroy() {
    console.log('GameService destroyed');
    this.intervalIds.forEach(intervalId => clearInterval(intervalId));
  }

  getGameState(roomId: string): GameState {
    if (!this.gameStates.has(roomId)) {
      this.gameStates.set(roomId, {
        player1: { y: 150 , direction: 0 },
        player2: { y: 150, direction: 0 },
        bot: false,
        ball: { x: 390, y: 190, dx: 2, dy: 2 },
        score: { player1: 0, player2: 0 },
      });

      const intervalId = setInterval(() => {
        this.updateBallPosition(roomId);
      }, 16);
      this.intervalIds.set(roomId, intervalId);
    }
    return this.gameStates.get(roomId);
  }

  updatePlayerPosition(roomId: string, position: boolean, direction: number): void {
    const gameState = this.getGameState(roomId);

    if (position) {
      gameState.player1.direction = direction;
    } else if (!position) {
      gameState.player2.direction = direction;
    }
  }

  updateBallPosition(roomId: string): void {
    const gameState = this.getGameState(roomId);
    let { x, y, dx, dy } = gameState.ball;
    const { player1, player2 } = gameState;
    
    player1.y = Math.max(0, Math.min(this.containerHeight - 100, player1.y + player1.direction * this.paddleSpeed));
    if (gameState.bot)
      player2.y = Math.max(0, Math.min(this.containerHeight - 100, player2.y + ((y - player2.y - 50) )));
    else
      player2.y = Math.max(0, Math.min(this.containerHeight - 100, player2.y + player2.direction * this.paddleSpeed));  

    x += dx;
    y += dy;

    if (y <= 0) {
      dy = Math.abs(dy);
      y = 0;
    } else if (y >= this.containerHeight - 20) {
      dy = Math.abs(dy) * -1;
      y = this.containerHeight - 20;
    }

    const paddleHit = (paddleY: number) => {
      const paddleCenter = paddleY + 50;
      const ballCenter = y + 10;
      const offset = ballCenter - paddleCenter;
      const normalizedOffset = offset / 50;
      return normalizedOffset * 5; // İstenilen zıplama açısı için çarpanı ayarlayın
    };

    if (
      (x <= 20 && x + 20 >= 10 && y + 20 >= player1.y && y <= player1.y + 100) ||
      (x >= this.containerWidth - 40 && x <= this.containerWidth - 20 && y + 20 >= player2.y && y <= player2.y + 100)
    ) {
      dx = -dx;
      if (x <= 20) {
        dy = paddleHit(player1.y);
      } else {
        dy = paddleHit(player2.y);
      }
    }

    if (x <= 0) {
      gameState.score.player2 += 1;
      this.resetBall(roomId, 'player2');
    } else if (x >= this.containerWidth - 20) {
      gameState.score.player1 += 1;
      this.resetBall(roomId, 'player1');
    } else {
      gameState.ball = { x, y, dx, dy };
    }
  }

  resetBall(roomId: string, lastScored: 'player1' | 'player2'): void {
    const gameState = this.getGameState(roomId);
    const angle = Math.random() * Math.PI / 4 - Math.PI / 8; // -22.5 ile 22.5 derece arasında rastgele bir açı
    const speed = 2;
    const dx = lastScored === 'player1' ? -speed * Math.cos(angle) : speed * Math.cos(angle);
    const dy = speed * Math.sin(angle);

    gameState.ball = {
      x: this.containerWidth / 2,
      y: this.containerHeight / 2,
      dx,
      dy,
    };
    //emit eklenecek
  }
}
