/**
 * Enables drag-and-drop with "Ghost" elements.
 * Supports:
 * 1. Dropping on a target (Discard Pile) to play.
 * 2. Dropping back on the container (Hand) to reorder.
 * 3. Snapping back to original position if dropped elsewhere.
 */
export function enableDragAndDrop(
  originalCard: HTMLElement,
  discardPileSelector: string,
  handContainerSelector: string,
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
    if (e.button !== 0) return; // Left click only
    e.preventDefault();

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;

    const rect = originalCard.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;

    // Create Ghost
    ghostCard = originalCard.cloneNode(true) as HTMLElement;
    ghostCard.style.position = "absolute";
    ghostCard.style.left = `${initialLeft}px`;
    ghostCard.style.top = `${initialTop}px`;
    ghostCard.style.width = `${rect.width}px`;
    ghostCard.style.height = `${rect.height}px`;
    ghostCard.style.zIndex = "9999";
    ghostCard.style.pointerEvents = "none"; // Click-through
    ghostCard.classList.add("dragging");

    document.body.appendChild(ghostCard);

    // Hide original (keeps the gap open)
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

    // Cleanup listeners
    document.removeEventListener("mousemove", drag);
    document.removeEventListener("mouseup", stopDrag);

    let actionTaken = false;

    // 1. CHECK DISCARD PILE (Play Card)
    const discardPile = document.querySelector(discardPileSelector);
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
        actionTaken = true;
        onDropCallback(originalCard);
      }
    }

    // 2. CHECK HAND (Reorder)
    // Only if we didn't play the card
    if (!actionTaken && ghostCard) {
      const handContainer = document.querySelector(handContainerSelector);
      const ghostRect = ghostCard.getBoundingClientRect();
      
      if (handContainer) {
        const handRect = handContainer.getBoundingClientRect();

        // Check if dropped roughly within the hand area
        if (
          ghostRect.top < handRect.bottom &&
          ghostRect.bottom > handRect.top &&
          ghostRect.left < handRect.right &&
          ghostRect.right > handRect.left
        ) {
          // Find where to insert
          const siblings = Array.from(handContainer.children) as HTMLElement[];
          
          // Filter out the ghost (if it somehow got in there) and the original card itself
          // We want to compare against the OTHER cards to find the gap.
          const targets = siblings.filter(el => 
            el !== originalCard && 
            el.classList.contains('playing-card') &&
            !el.classList.contains('dragging')
          );

          let insertBeforeElement: HTMLElement | null = null;

          for (const target of targets) {
            const targetRect = target.getBoundingClientRect();
            const targetCenter = targetRect.left + targetRect.width / 2;

            // If mouse is to the left of this card's center, insert before it
            if (e.clientX < targetCenter) {
              insertBeforeElement = target;
              break;
            }
          }

          // Perform the move in the DOM
          if (insertBeforeElement) {
            handContainer.insertBefore(originalCard, insertBeforeElement);
          } else {
            // If no target found, append to end
            handContainer.appendChild(originalCard);
          }
          actionTaken = true;
        }
      }
    }

    // 3. CLEANUP (Snap Back)
    if (ghostCard) {
      ghostCard.remove();
      ghostCard = null;
    }
    // Always make original visible again. 
    // If it was moved (reordered), it appears in new spot.
    // If not moved (invalid drop), it appears in old spot.
    originalCard.style.opacity = "1";
  }
}