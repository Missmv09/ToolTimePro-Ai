/**
 * @jest-environment jsdom
 */

/**
 * Tests for lib/patch-dom — the guard that keeps React alive when a browser
 * translator (Chrome "Translate this page") has rewrapped text nodes React
 * still thinks it owns. Simulates translation by moving a child into a <font>
 * wrapper, exactly as Chrome does, then performs the DOM moves React makes.
 */

import { DomPatch } from '@/lib/patch-dom';

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  DomPatch();
});

function translateInPlace(textHolder: HTMLElement) {
  // Chrome replaces the text node with <font><font>translated</font></font>.
  const original = textHolder.firstChild as Node;
  const font = document.createElement('font');
  font.appendChild(original);
  textHolder.appendChild(font);
  return original;
}

describe('lib/patch-dom', () => {
  it('leaves normal removeChild and insertBefore behaviour unchanged', () => {
    const parent = document.createElement('div');
    const a = document.createElement('span');
    const b = document.createElement('span');
    parent.appendChild(a);
    parent.appendChild(b);

    const c = document.createElement('span');
    expect(parent.insertBefore(c, b)).toBe(c);
    expect(Array.from(parent.childNodes)).toEqual([a, c, b]);

    expect(parent.removeChild(c)).toBe(c);
    expect(Array.from(parent.childNodes)).toEqual([a, b]);
  });

  it('does not throw when React removes a text node the translator moved', () => {
    const button = document.createElement('button');
    button.appendChild(document.createTextNode('Send Quote'));
    const movedText = translateInPlace(button);
    expect(movedText.parentNode).not.toBe(button);

    // React re-renders the button label and tries to remove the text node it created.
    expect(() => button.removeChild(movedText)).not.toThrow();
    expect(button.removeChild(movedText)).toBe(movedText);
  });

  it('appends instead of throwing when the reference node was moved by the translator', () => {
    const box = document.createElement('div');
    box.appendChild(document.createTextNode('Saving & Sending...'));
    const movedText = translateInPlace(box);

    // React swaps in the success state before the (now moved) old text node.
    const success = document.createElement('div');
    success.textContent = 'Quote Saved & Sent!';
    expect(() => box.insertBefore(success, movedText)).not.toThrow();
    expect(box.contains(success)).toBe(true);
    expect(box.textContent).toContain('Quote Saved & Sent!');
  });

  it('only patches once', () => {
    const before = Node.prototype.insertBefore;
    DomPatch();
    DomPatch();
    expect(Node.prototype.insertBefore).toBe(before);
  });
});
