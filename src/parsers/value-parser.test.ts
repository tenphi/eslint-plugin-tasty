import { describe, it, expect } from 'vitest';
import {
  parseValue,
  flattenTokens,
  extractTokensByType,
} from './value-parser.js';

describe('value-parser', () => {
  describe('basic token classification', () => {
    it('classifies color tokens', () => {
      const result = parseValue('#purple');
      const tokens = flattenTokens(result);
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({ type: 'color-token', name: 'purple' });
      expect(result.errors).toHaveLength(0);
    });

    it('classifies color tokens with opacity', () => {
      const result = parseValue('#purple.5');
      const tokens = flattenTokens(result);
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        type: 'color-token',
        name: 'purple',
        opacity: '5',
      });
    });

    it('classifies double-hash color references', () => {
      const result = parseValue('##purple');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({ type: 'color-ref', name: 'purple' });
    });

    it('classifies custom properties', () => {
      const result = parseValue('$spacing');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({ type: 'custom-prop', name: 'spacing' });
    });

    it('classifies double-dollar custom property refs', () => {
      const result = parseValue('$$my-var');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({
        type: 'custom-prop-ref',
        name: 'my-var',
      });
    });

    it('classifies custom units', () => {
      const result = parseValue('2x');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({
        type: 'custom-unit',
        value: 2,
        unit: 'x',
      });
    });

    it('classifies CSS units', () => {
      const result = parseValue('10px');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({
        type: 'css-unit',
        value: 10,
        unit: 'px',
      });
    });

    it('classifies numbers', () => {
      const result = parseValue('0.5');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({ type: 'number', value: 0.5 });
    });

    it('classifies keywords', () => {
      const result = parseValue('auto');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({ type: 'keyword', value: 'auto' });
    });

    it('classifies CSS functions', () => {
      const result = parseValue('rgb(255, 0, 0)');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({
        type: 'css-function',
        name: 'rgb',
      });
    });

    it('classifies !important', () => {
      const result = parseValue('#red !important');
      const tokens = flattenTokens(result);
      expect(tokens).toHaveLength(2);
      expect(tokens[1]).toMatchObject({ type: 'important' });
    });

    it('classifies strings', () => {
      const result = parseValue('"hello"');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({ type: 'string', value: 'hello' });
    });

    it('marks unknown tokens', () => {
      const result = parseValue('purle');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({ type: 'unknown', raw: 'purle' });
    });
  });

  describe('groups and parts', () => {
    it('splits on commas into groups', () => {
      const result = parseValue('1bw #red, 2bw #blue top');
      expect(result.groups).toHaveLength(2);
    });

    it('splits on spaced slashes into parts', () => {
      const result = parseValue('2px #purple / 2px');
      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].parts).toHaveLength(2);
    });

    it('keeps non-spaced slashes in tokens', () => {
      const result = parseValue('center/cover');
      const tokens = flattenTokens(result);
      expect(tokens).toHaveLength(1);
    });
  });

  describe('error reporting', () => {
    it('reports unbalanced parentheses', () => {
      const result = parseValue('rgb(255, 0, 0');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('parenthes');
    });

    it('reports unknown units', () => {
      const result = parseValue('2q');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Unknown unit 'q'");
    });

    it('reports invalid color token opacity', () => {
      const result = parseValue('#purple.150');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('exceeds 100');
    });

    it('reports empty color token name', () => {
      const result = parseValue('#');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Empty color token');
    });

    it('reports trailing dot', () => {
      const result = parseValue('#purple.');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Trailing dot');
    });
  });

  describe('extractTokensByType', () => {
    it('extracts color tokens', () => {
      const result = parseValue('#purple.5 #blue 2x');
      const colors = extractTokensByType(result, 'color-token');
      expect(colors).toHaveLength(2);
      expect(colors[0].name).toBe('purple');
      expect(colors[1].name).toBe('blue');
    });
  });

  describe('config-aware units', () => {
    it('accepts configured custom units', () => {
      const result = parseValue('3cols', { knownUnits: ['cols'] });
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({
        type: 'custom-unit',
        unit: 'cols',
      });
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('parenthesized expressions', () => {
    it('handles group expressions', () => {
      const result = parseValue('(100% - 2x)');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({ type: 'group-expr' });
    });

    it('handles color fallback syntax', () => {
      const result = parseValue('(#primary, #secondary)');
      const tokens = flattenTokens(result);
      expect(tokens[0]).toMatchObject({ type: 'group-expr' });
    });
  });
});
