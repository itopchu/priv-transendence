import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

interface Player {
  y: number;
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
  ball: Ball;
  score: { player1: number, player2: number };
}

@Injectable()
export class GameService implements OnModuleInit, OnModuleDestroy {
  private gameStates: Map<string, GameState> = new Map(); // roomId -> gameState
  private intervalIds: Map<string, NodeJS.Timeout> = new Map(); // roomId -> intervalId

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
        player1: { y: 150 },
        player2: { y: 150 },
        ball: { x: 390, y: 190, dx: 2, dy: 2 },
        score: { player1: 0, player2: 0 },
      });

      // Yeni bir oyun odası için zamanlayıcı başlat
      const intervalId = setInterval(() => {
        this.updateBallPosition(roomId);
      }, 16); // yaklaşık 60 FPS
      this.intervalIds.set(roomId, intervalId);
    }
    return this.gameStates.get(roomId);
  }

  updatePlayerPosition(roomId: string, position: boolean, y: number): void {
    const gameState = this.getGameState(roomId);

    if (position) {
      gameState.player1.y = y;
    } else if (!position) {
      gameState.player2.y = y;
    }
  }

  updateBallPosition(roomId: string): void {
    const gameState = this.getGameState(roomId);

    let { x, y, dx, dy } = gameState.ball;
    const { player1, player2 } = gameState;

    
    x += dx;
    y += dy;

    if (y <= 0 || y >= 390) dy = -dy;

    if (
      (x <= 20 && y >= player1.y && y <= player1.y + 100) ||
      (x >= 770 && y >= player2.y && y <= player2.y + 100)
    ) {
      dx = -dx;
    }

    const resetBall = () => {
      gameState.ball = { x: 390, y: 190, dx: 2, dy: 2 };
    }
   if (x <= 0) {
      gameState.score.player2 += 1;
      resetBall();
    } else if (x >= 780) {
      gameState.score.player1 += 1;
      resetBall();
    } else {
      gameState.ball = { x, y, dx, dy };
    }
  }
}
