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
    currentPlayer: number;
    players: User[];
    topDiscardCard: DisplayGameCard[];
  }) => {
    console.log({ gameState });
    
    // Update the discard pile with the top card
    updateDiscardPile(gameState.topDiscardCard);
    
    // Update opponent card counts (optional for now)
    // updateOpponentHands(gameState.players);
  },
);

socket.on("game:player-hand", (cards: DisplayGameCard[]) => {
  console.log("Updated hand:", cards);
  updatePlayerHand(cards);
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
    enableDragAndDrop(element, ".discard-pile", ".player-hand", (droppedCard) => {
  const color = droppedCard.dataset.color;
  const value = droppedCard.dataset.value;

  console.log(`Action: Dragged & Dropped ${color} ${value}`);

  const cardId = parseInt(droppedCard.dataset.id || "0");
  if (cardId) {
    socket.emit(GAME_PLAY_CARD, { cardId });
  }

  // Don't remove immediately - wait for server confirmation via GAME_UPDATED
  // droppedCard.remove(); 
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
 * Renders the top discard card
 */
function updateDiscardPile(topDiscardCards: DisplayGameCard[]) {
  const discardPile = document.querySelector(".discard-pile");
  
  if (!discardPile) return;
  
  // Get the top card (the last card in the array)
  const topCard = topDiscardCards[topDiscardCards.length - 1];
  
  if (!topCard) return;
  
  // Clear the discard pile and add the new top card
  discardPile.innerHTML = `
    <div 
      class="playing-card ${topCard.card_color}" 
      data-value="${topCard.card_symbol}"
      data-id="${topCard.id}"
    ></div>
  `;
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
    cardElement.dataset.value = card.card_symbol;
    cardElement.dataset.id = card.id.toString();
    
    // Re-enable drag and drop for the new card
    enableDragAndDrop(cardElement, ".discard-pile", ".player-hand", (droppedCard) => {
      const cardId = parseInt(droppedCard.dataset.id || "0");
      if (cardId) {
        socket.emit(GAME_PLAY_CARD, { cardId });
      }
      droppedCard.remove();
    });
    
    playerHand.appendChild(cardElement);
  });
}
