'use client';

// Global DOM patch: survive browser page translation.
//
// Chrome's "Translate this page" (and similar extensions) rewrite text nodes
// in place, wrapping them in <font> elements React knows nothing about. On the
// next re-render React calls removeChild / insertBefore against its own
// bookkeeping, the browser throws
//   NotFoundError: Failed to execute 'insertBefore' on 'Node': The node before
//   which the new node is to be inserted is not a child of this node.
// and the whole page collapses to the error boundary. Seen on Smart Quote when
// pressing Send with the page translated (the quote still went out).
//
// This is the long-standing workaround from facebook/react#11538: when the
// node React is working from is no longer where React left it, do the
// closest sensible thing instead of throwing. Real programming errors that hit
// the same branch are still reported to the console.

let patched = false;

function applyPatch() {
  if (patched || typeof window === 'undefined' || typeof Node === 'undefined') return;
  patched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function patchedRemoveChild<T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      console.warn('[patch-dom] removeChild: node is no longer a child of its React parent (page translated?)');
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function patchedInsertBefore<T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('[patch-dom] insertBefore: reference node is no longer a child of its React parent (page translated?)');
      // Keep the content on screen rather than dropping it.
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

export function DomPatch() {
  applyPatch();
  return null;
}
