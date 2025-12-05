/**
 * Game page interaction logic
 * Handles Uno card selection and gameplay
 */

import "./styles/game.css"; // Ensure styles are loaded if using bundler

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
    card.addEventListener("click", () => {
      const element = card as HTMLElement;
      
      // UNO CHANGE: Use data-value/color instead of rank/suit
      const value = element.dataset.value;
      
      if (!value) return;

      // Toggle selection
      if (element.classList.contains("selected")) {
        deselectCard();
      } else {
        selectCard(element);
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

  console.log(
    "Selected:", 
    cardElement.dataset.color, 
    cardElement.dataset.value
  );
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

      // TODO: Emit socket event 'game:draw'
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
        
        // TODO: Emit socket event 'game:play' with card ID
        
        // Temporary visual cleanup for demo
        deselectCard();
      } else {
        console.log("No card selected to play");
      }
    });
  }
}