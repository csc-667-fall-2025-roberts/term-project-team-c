import socketIo from "socket.io-client";
import { enableDragAndDrop } from "./drag-drop";
import { GAME_DRAW_CARD, GAME_PLAY_CARD, GAME_UPDATED } from "@shared/keys";
import { DisplayGameCard, User } from "@shared/types";
// import "./styles/game.css";

const gameId = document.body.dataset.gameId || "";

const socket = socketIo({ query: { gameId } });

// Request initial game state when socket connects
socket.on("connect", () => {
  console.log("Socket connected, requesting game state");
});

socket.on(
  GAME_UPDATED,
  (gameState: {
    playerHands: Record<number, DisplayGameCard[]>;
    currentPlayer: number | null;
    players: User[];
    topDiscardCard: DisplayGameCard[];
    activeColor?: string | null;
    winnerId?: number | null;
  }) => {
    console.log({ gameState });

    const isGameOver = (gameState.winnerId ?? null) !== null;

    if (isGameOver) {
      showGameOver(gameState);
      return;
    }
    
    // Update the discard pile with the top card
    updateDiscardPile(gameState.topDiscardCard, gameState.activeColor);
    if (gameState.currentPlayer != null) {
      updateOpponentHands(gameState.playerHands, gameState.currentPlayer);
      updateTurnIndicator(gameState.currentPlayer);
    }
  },
);

socket.on("game:player-hand", (cards: DisplayGameCard[]) => {
  console.log("Updated hand:", cards);
  updatePlayerHand(cards);
});

socket.on("game:current-turn", (data: { userId: number, username: string }) => {
  updateTurnIndicator(data.userId);
});

socket.on("game:error", ({ message }: { message: string }) => {
  console.error("Game error:", message);
  alert(`Error: ${message}`);
});

// Track the currently selected card element
let selectedCardElement: HTMLElement | null = null;

document.addEventListener("DOMContentLoaded", () => {
  initializeCardSelection();
  initializeDrawPile();
  initializeDiscardPile();
});

/**
 * 1. PLAYER HAND INTERACTION
 * Allows selecting/deselecting cards in your hand
 */
function initializeCardSelection() {
  const playerCards = document.querySelectorAll(".player-hand .playing-card");

  playerCards.forEach((card) => {
    const element = card as HTMLElement;
    
    // UPDATED: Added ".player-hand" as the 3rd argument
  enableDragAndDrop(element, ".discard-pile", ".player-hand", async (droppedCard) => {
  const symbol = droppedCard.dataset.symbol || droppedCard.dataset.value || '';
  const cardId = parseInt(droppedCard.dataset.id || "0");

  if (cardId) {
    let chosenColor: string | undefined;

    // If it's a wild card, prompt for color
    if (isWildCard(symbol)) {
      chosenColor = await promptColorChoice();
    }

    socket.emit(GAME_PLAY_CARD, { cardId, chosenColor });
  }
  });
  });
}

function selectCard(cardElement: HTMLElement) {
  // Deselect others first (you can only pick one card in Uno)
  deselectCard();

  // Select this one
  cardElement.classList.add("selected");
  selectedCardElement = cardElement;

  console.log("Selected:", cardElement.dataset.color, cardElement.dataset.value);
}

function deselectCard() {
  if (!selectedCardElement) return;

  selectedCardElement.classList.remove("selected");
  selectedCardElement = null;
}

/**
 * 2. DRAW PILE INTERACTION
 * Handles clicking the deck to draw a card
 */
function initializeDrawPile() {
  const drawPile = document.getElementById("draw-pile");

  if (drawPile) {
    drawPile.addEventListener("click", () => {
      console.log("Action: Draw Card requested");

      // Visual feedback
      drawPile.classList.add("drawing");
      setTimeout(() => drawPile.classList.remove("drawing"), 500);

      socket.emit(GAME_DRAW_CARD);
    });
  }
}

/**
 * 3. DISCARD PILE INTERACTION
 * Handles playing the selected card onto the pile
 */
function initializeDiscardPile() {
  const discardPile = document.querySelector(".discard-pile");

  if (discardPile) {
    discardPile.addEventListener("click", () => {
      if (selectedCardElement) {
        const color = selectedCardElement.dataset.color;
        const value = selectedCardElement.dataset.value;

        console.log(`Action: Attempting to play ${color} ${value}`);

        const cardId = parseInt(selectedCardElement.dataset.id || "0");
        if (cardId) {
          socket.emit(GAME_PLAY_CARD, { cardId });
          // Don't remove immediately - wait for server confirmation
          // selectedCardElement.remove();
        }
        deselectCard();
      } else {
        console.log("No card selected to play");
      }
    });
  }
}

/**
 * 4. UPDATE DISCARD PILE
 * Renders the top discard card and active color indicator
 */
function updateDiscardPile(topDiscardCards: DisplayGameCard[], activeColor?: string | null) {
  const discardPile = document.querySelector(".discard-pile") as HTMLElement | null;

  if (!discardPile) return;

  // Get the top card (the first card in the array, since it's ordered DESC)
  const topCard = topDiscardCards[0];

  if (!topCard) return;
  
  // Clear the discard pile and add the new top card
  const displayValue = getCardDisplayValue(topCard.card_symbol);
  discardPile.innerHTML = `
    <div
      class="playing-card ${topCard.card_color}"
      data-value="${displayValue}"
      data-symbol="${topCard.card_symbol}"
      data-id="${topCard.id}"
    ></div>
  `;
  
  // [FIX] Always show active color indicator if activeColor is present
  // This ensures that even if you play a "Blue 5", the indicator confirms "Blue" is active
  if (activeColor) {
    const colorIndicator = document.createElement('div');
    colorIndicator.className = 'active-color-indicator';
    colorIndicator.style.cssText = `
      position: absolute;
      top: -10px;
      right: -10px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid white;
      background: var(--${activeColor});
      box-shadow: 0 0 10px rgba(0,0,0,0.5);
      z-index: 10;
    `;
    discardPile.style.position = 'relative';
    discardPile.appendChild(colorIndicator);
  }
}

/**
 * 5. UPDATE PLAYER HAND
 * Re-renders your hand when cards are added/removed
 */
function updatePlayerHand(cards: DisplayGameCard[]) {
  const playerHand = document.querySelector(".player-hand");
  
  if (!playerHand) return;
  
  // Clear current hand
  playerHand.innerHTML = "";
  
  // Add each card
  cards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.className = `playing-card ${card.card_color}`;
    cardElement.dataset.value = getCardDisplayValue(card.card_symbol);
    cardElement.dataset.symbol = card.card_symbol;
    cardElement.dataset.id = card.id.toString();

    // Re-enable drag and drop for the new card with proper wild card handling
    enableDragAndDrop(cardElement, ".discard-pile", ".player-hand", async (droppedCard) => {
      const symbol = droppedCard.dataset.symbol || '';
      const cardId = parseInt(droppedCard.dataset.id || "0");

      if (cardId) {
        let chosenColor: string | undefined;

        // If it's a wild card, prompt for color
        if (isWildCard(symbol)) {
          chosenColor = await promptColorChoice();
        }

        socket.emit(GAME_PLAY_CARD, { cardId, chosenColor });
      }
    });

    playerHand.appendChild(cardElement);
  });
}

/**
 * 6. UPDATE OPPONENT HANDS
 * Updates the card count display for opponents
 */
function updateOpponentHands(
  playerHands: Record<number, DisplayGameCard[]>,
  currentPlayerId: number
) {
  const myUserId = parseInt(document.body.dataset.userId || "0");
  
  Object.entries(playerHands).forEach(([userId, cards]) => {
    const playerIdNum = parseInt(userId);
    
    // Skip the current user's hand
    if (playerIdNum === myUserId) return;
    
    // Find opponent card container (you'll need to add data-user-id to opponent divs)
    const opponentHand = document.querySelector(`[data-user-id="${userId}"] .opponent-hand`);
    
    if (opponentHand) {
      opponentHand.innerHTML = "";
      
      // Add back-facing cards for each card in opponent's hand
      for (let i = 0; i < cards.length; i++) {
        const cardBack = document.createElement("div");
        cardBack.className = "playing-card back";
        if (i > 0) {
          cardBack.style.marginTop = "-80px";
        }
        opponentHand.appendChild(cardBack);
      }
    }
  });
}

async function promptColorChoice(): Promise<string> {
  return new Promise((resolve) => {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    // Create color picker container
    const container = document.createElement('div');
    container.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Choose a Color';
    title.style.marginBottom = '20px';
    container.appendChild(title);

    const colors = [
      { name: 'red', hex: '#e74c3c' },
      { name: 'blue', hex: '#3498db' },
      { name: 'green', hex: '#2ecc71' },
      { name: 'yellow', hex: '#f1c40f' },
    ];

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 15px;
      justify-content: center;
    `;

    colors.forEach(({ name, hex }) => {
      const button = document.createElement('button');
      button.textContent = name.toUpperCase();
      button.style.cssText = `
        background: ${hex};
        color: ${name === 'yellow' ? '#333' : 'white'};
        border: none;
        padding: 15px 25px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        transition: transform 0.1s;
      `;
      
      button.addEventListener('mouseover', () => {
        button.style.transform = 'scale(1.1)';
      });
      
      button.addEventListener('mouseout', () => {
        button.style.transform = 'scale(1)';
      });

      button.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve(name);
      });

      buttonContainer.appendChild(button);
    });

    container.appendChild(buttonContainer);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
  });
}

/**
 * Checks if a card is a wild card that needs color selection
 */
function isWildCard(cardSymbol: string): boolean {
  return cardSymbol === 'wildcard' || cardSymbol === 'plus_four';
}

/**
 * Converts database card symbols to display values
 */
function getCardDisplayValue(symbol: string): string {
  const symbolMap: Record<string, string> = {
    'zero': '0',
    'one': '1',
    'two': '2',
    'three': '3',
    'four': '4',
    'five': '5',
    'six': '6',
    'seven': '7',
    'eight': '8',
    'nine': '9',
    'skip': '⊘',
    'swap': '⇄',
    'plus_two': '+2',
    'plus_four': '+4',
    'wildcard': '🌈',
  };

  return symbolMap[symbol] || symbol;
}

/**
 * 7. UPDATE TURN INDICATOR
 * Shows whose turn it is
 */
function updateTurnIndicator(currentPlayerId: number) {
  const turnIndicator = document.getElementById("turn-indicator");
  
  if (!turnIndicator) {
    // Create turn indicator if it doesn't exist
    const indicator = document.createElement("div");
    indicator.id = "turn-indicator";
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 15px 25px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 100;
    `;
    document.body.appendChild(indicator);
  }
  
  const indicator = document.getElementById("turn-indicator")!;
  
  // Check if it's the current user's turn (you'll need userId from somewhere)
  const myUserId = parseInt(document.body.dataset.userId || "0");
  
  if (currentPlayerId === myUserId) {
    indicator.textContent = "YOUR TURN";
    indicator.style.background = "#27ae60";
  } else {
    indicator.textContent = "Waiting...";
    indicator.style.background = "rgba(0, 0, 0, 0.8)";
  }
}

function showGameOver(gameState: {
  players: User[];
  winnerId?: number | null;
}) {
  const myUserId = parseInt(document.body.dataset.userId || "0");
  const winner =
    gameState.winnerId != null
      ? gameState.players.find((p) => p.id === gameState.winnerId)
      : null;

  const message = winner
    ? winner.id === myUserId
      ? "🎉 You win!"
      : `🎉 ${winner.username} wins!`
    : "Game over";

  // Create or update a status banner
  let statusEl = document.getElementById("game-status");
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.id = "game-status";
    statusEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 30px 40px;
      border-radius: 12px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      z-index: 2000;
    `;
    document.body.appendChild(statusEl);
  }

  statusEl.textContent = message;

  // Disable input: drawing & playing
  const drawPile = document.getElementById("draw-pile");
  if (drawPile) {
    drawPile.style.pointerEvents = "none";
    drawPile.style.opacity = "0.5";
  }

  const playerHand = document.querySelector(".player-hand") as HTMLElement | null;
  if (playerHand) {
    playerHand.style.pointerEvents = "none";
    playerHand.style.opacity = "0.7";
  }

  const indicator = document.getElementById("turn-indicator");
  if (indicator) {
    indicator.textContent = "Game Over";
    indicator.style.background = "#c0392b";
  }
}