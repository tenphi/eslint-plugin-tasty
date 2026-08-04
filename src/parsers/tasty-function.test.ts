import { parseValue } from './value-parser.js';

/**
 * `$$name(...)` is a Tasty `@function` call, added in v3; bare `$$name` is the
 * custom-property reference `transition` has always used. The two share a prefix,
 * so the call form has to be recognized before the bare-name validation runs —
 * otherwise `$$negative(10px)` is rejected as an invalid property name.
 */
describe('$$name(...) / ##name(...) function calls', () => {
  const tokensOf = (src: string) =>
    parseValue(src).groups.flatMap((group) =>
      group.parts.flatMap((part) => part.tokens),
    );

  it('classifies a $$ call as tasty-function', () => {
    const [token] = tokensOf('$$negative(10px)');

    expect(token).toEqual({
      type: 'tasty-function',
      name: 'negative',
      args: '10px',
      raw: '$$negative(10px)',
    });
  });

  it('classifies a ## call as tasty-function', () => {
    const [token] = tokensOf('##tint(#purple)');

    expect(token).toMatchObject({ type: 'tasty-function', name: 'tint' });
  });

  it('reports no errors for a well-formed call', () => {
    expect(parseValue('$$negative(10px)').errors).toEqual([]);
    expect(parseValue('##tint(#purple)').errors).toEqual([]);
  });

  it('keeps the bare $$name reference form that transition uses', () => {
    const [token] = tokensOf('$$gradient-angle');

    expect(token).toEqual({
      type: 'custom-prop-ref',
      name: 'gradient-angle',
      raw: '$$gradient-angle',
    });
  });

  it('keeps the bare ##name reference form', () => {
    const [token] = tokensOf('##accent');

    expect(token).toMatchObject({ type: 'color-ref', name: 'accent' });
  });

  it('rejects a malformed function name', () => {
    const result = parseValue('$$9bad(10px)');

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Invalid function name');
  });

  it('handles nested parentheses in arguments', () => {
    const [token] = tokensOf('$$shade(var(--x), 10%)');

    expect(token).toMatchObject({
      type: 'tasty-function',
      name: 'shade',
      args: 'var(--x), 10%',
    });
  });

  it('parses a call alongside other tokens', () => {
    const tokens = tokensOf('$$negative(2x) auto');

    expect(tokens.map((token) => token.type)).toEqual([
      'tasty-function',
      'keyword',
    ]);
  });
});
