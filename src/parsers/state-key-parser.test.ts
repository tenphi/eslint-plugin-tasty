import { describe, it, expect } from 'vitest';
import { parseStateKey, validateStateDefinition } from './state-key-parser.js';

describe('state-key-parser', () => {
  describe('valid state keys', () => {
    it('accepts empty string', () => {
      const result = parseStateKey('');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts boolean modifiers', () => {
      const result = parseStateKey('hovered');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts value modifiers', () => {
      const result = parseStateKey('theme=dark');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts pseudo-classes', () => {
      const result = parseStateKey(':hover');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts combined states', () => {
      const result = parseStateKey('hovered & !disabled');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts OR operator', () => {
      const result = parseStateKey('hovered | focused');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts class selectors', () => {
      const result = parseStateKey('.active');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts attribute selectors', () => {
      const result = parseStateKey('[aria-expanded="true"]');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts @media queries', () => {
      const result = parseStateKey('@media(w < 768px)');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts @root states', () => {
      const result = parseStateKey('@root(theme=dark)');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts @parent states', () => {
      const result = parseStateKey('@parent(hovered)');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts @parent with direct parent', () => {
      const result = parseStateKey('@parent(hovered, >)');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts @starting', () => {
      const result = parseStateKey('@starting');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts @supports', () => {
      const result = parseStateKey('@supports(display: grid)');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts container queries', () => {
      const result = parseStateKey('@(w < 600px)');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts @media range queries', () => {
      const result = parseStateKey('@media(600px <= w < 1200px)');
      expect(result.errors).toHaveLength(0);
    });

    it('accepts value modifier operators', () => {
      expect(parseStateKey('size^=sm').errors).toHaveLength(0);
      expect(parseStateKey('size$=lg').errors).toHaveLength(0);
      expect(parseStateKey('size*=med').errors).toHaveLength(0);
    });
  });

  describe('invalid state keys', () => {
    it('reports unrecognized characters', () => {
      const result = parseStateKey('???');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('reports numeric-starting tokens', () => {
      const result = parseStateKey('123invalid');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('@own tracking', () => {
    it('tracks @own usage', () => {
      const result = parseStateKey('@own(hovered)');
      expect(result.hasOwn).toBe(true);
    });

    it('does not track @own in regular states', () => {
      const result = parseStateKey('hovered');
      expect(result.hasOwn).toBe(false);
    });
  });

  describe('alias tracking', () => {
    it('tracks @alias references', () => {
      const result = parseStateKey('@mobile');
      expect(result.referencedAliases).toContain('@mobile');
    });

    it('does not track built-in prefixes as aliases', () => {
      const result = parseStateKey('@media(w < 768px)');
      expect(result.referencedAliases).toHaveLength(0);
    });
  });

  describe('validateStateDefinition', () => {
    it('validates valid definitions', () => {
      const result = validateStateDefinition('@media(w < 768px)');
      expect(result.errors).toHaveLength(0);
    });

    it('validates root definitions', () => {
      const result = validateStateDefinition('@root(theme=dark)');
      expect(result.errors).toHaveLength(0);
    });

    it('reports empty media queries', () => {
      const result = validateStateDefinition('@media()');
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
