/**
 * Enables drag-and-drop by creating a temporary clone (ghost) of the card.
 * This prevents the card from disappearing behind other elements or messing up the hand layout.
 */
export function enableDragAndDrop(
  originalCard: HTMLElement,
  discardPileSelector: string,
  onDropCallback: (card: HTMLElement) => void,
) {
  let isDragging = false;
  let ghostCard: HTMLElement | null = null;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  originalCard.addEventListener("mousedown", startDrag);

  function startDrag(e: MouseEvent) {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    // 1. Get the original card's position
    const rect = originalCard.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // 2. Create the "Ghost Card" (Clone)
    ghostCard = originalCard.cloneNode(true) as HTMLElement;
    
    // 3. Style the Ghost to look exactly like the moving card
    ghostCard.style.position = "absolute";
    ghostCard.style.left = `${initialLeft}px`;
    ghostCard.style.top = `${initialTop}px`;
    ghostCard.style.width = `${rect.width}px`;
    ghostCard.style.height = `${rect.height}px`;
    ghostCard.style.zIndex = "9999"; // On top of EVERYTHING
    ghostCard.style.pointerEvents = "none"; // Let mouse events pass through to check for drops
    ghostCard.classList.add("dragging"); // Apply your CSS rotation/scale

    // 4. Add Ghost to Body (so it's not clipped by the game container)
    document.body.appendChild(ghostCard);

    // 5. Hide the original card (but keep its space in the hand)
    originalCard.style.opacity = "0";

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", stopDrag);
  }

  function drag(e: MouseEvent) {
    if (!isDragging || !ghostCard) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    ghostCard.style.left = `${initialLeft + dx}px`;
    ghostCard.style.top = `${initialTop + dy}px`;
  }

  function stopDrag(e: MouseEvent) {
    if (!isDragging) return;
    isDragging = false;

    // Clean up listeners
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);

    // Check for drop on Discard Pile
    const discardPile = document.querySelector(discardPileSelector);
    let droppedSuccessfully = false;

    if (discardPile && ghostCard) {
      const ghostRect = ghostCard.getBoundingClientRect();
      const pileRect = discardPile.getBoundingClientRect();

      // Check overlap
      const overlap =
        ghostRect.left < pileRect.right &&
        ghostRect.right > pileRect.left &&
        ghostRect.top < pileRect.bottom &&
        ghostRect.bottom > pileRect.top;

      if (overlap) {
        droppedSuccessfully = true;
        onDropCallback(originalCard);
      }
    }

    // Cleanup
    if (ghostCard) {
      ghostCard.remove();
      ghostCard = null;
    }

    // If NOT dropped, show the original card again
    if (!droppedSuccessfully) {
      originalCard.style.opacity = "1";
    } else {
      // If dropped, we might still want to reset opacity if the game logic 
      // doesn't immediately remove it, but usually the callback handles it.
      // For safety, we can reset it, or let the callback remove the element.
      originalCard.style.opacity = "1"; 
    }
  }
}