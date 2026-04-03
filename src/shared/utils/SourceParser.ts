import { TFile, App, FrontMatterCache, getAllTags } from 'obsidian';

type TokenType =
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LPAREN'
  | 'RPAREN'
  | 'TAG'
  | 'PROPERTY'
  | 'EQUALS'
  | 'STRING'
  | 'EOF';

interface Token {
  type: TokenType;
  value?: string;
}

interface ASTNode {
  type: string;
  left?: ASTNode;
  right?: ASTNode;
  expr?: ASTNode;
  value?: string;
  property?: string;
}

export class SourceParser {
  private app: App;
  private tokens: Token[] = [];
  private current = 0;

  constructor(app: App) {
    this.app = app;
  }

  public parse(source: string): (file: TFile) => boolean {
    if (!source || !source.trim()) return () => true;

    // Remove "FROM" if present (case insensitive)
    let cleanSource = source.trim();
    if (/^FROM\s+/i.test(cleanSource)) {
      cleanSource = cleanSource.replace(/^FROM\s+/i, '');
    }

    try {
      this.tokens = this.tokenize(cleanSource);
      this.current = 0;
      const ast = this.expression();
      if (!ast) return () => true;
      return (file: TFile) => this.evaluate(ast, file);
    } catch (e) {
      console.error('SourceParser Error:', e);
      return () => false; // Fail safe
    }
  }

  private tokenize(source: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < source.length) {
      const char = source[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (char === '(') {
        tokens.push({ type: 'LPAREN' });
        i++;
        continue;
      }

      if (char === ')') {
        tokens.push({ type: 'RPAREN' });
        i++;
        continue;
      }

      if (char === '=') {
        tokens.push({ type: 'EQUALS' });
        i++;
        continue;
      }

      // Negation: ! or -
      // But - could be part of a word or tag if not separated
      // DQL: -#tag is negation. -"folder" is negation.
      // "folder-name" is a string.
      // If - is followed by space, #, ", ', or (, it is definitely NOT.
      // If - is followed by alphanum, it MIGHT be start of a negative number (not supported) or just a word starting with -?
      // Let's assume - is NOT only if it's strictly a prefix operator.
      // Actually, for simplicity in file paths, "my-file" is one token.
      // So if '-' is at start of a token, check if it's standalone?
      // A simple heuristic: if char is '!' it is NOT.
      // If char is '-' and next char is space, #, ", ', (, or end of string, it is NOT.
      if (
        char === '!' ||
        (char === '-' && (i + 1 >= source.length || /[\s#("']/.test(source[i + 1])))
      ) {
        tokens.push({ type: 'NOT' });
        i++;
        continue;
      }

      // Quoted String
      if (char === '"' || char === "'") {
        const quote = char;
        let val = '';
        i++; // skip open quote
        while (i < source.length && source[i] !== quote) {
          if (source[i] === '\\' && i + 1 < source.length) {
            val += source[i + 1];
            i += 2;
          } else {
            val += source[i];
            i++;
          }
        }
        i++; // skip close quote
        tokens.push({ type: 'STRING', value: val });
        continue;
      }

      // Tag
      if (char === '#') {
        let val = '#';
        i++;
        // Read until we hit a delimiter or whitespace
        // Allowed chars in tags are broad, but typically exclude space, #, comma, brackets
        // We'll read until we hit a character that usually ends a tag
        while (i < source.length && !/[\s#(),!"']/.test(source[i])) {
          val += source[i];
          i++;
        }
        tokens.push({ type: 'TAG', value: val });
        continue;
      }

      if (char === '.') {
        let val = '';
        i++;
        while (i < source.length && /[a-zA-Z0-9_-]/.test(source[i])) {
          val += source[i];
          i++;
        }

        if (val) {
          tokens.push({ type: 'PROPERTY', value: val });
          continue;
        }
      }

      // Word / Identifier / Unquoted String
      if (/[a-zA-Z0-9_\-/.]/.test(char)) {
        let val = '';
        while (i < source.length && /[a-zA-Z0-9_\-/.]/.test(source[i])) {
          val += source[i];
          i++;
        }

        const lower = val.toLowerCase();
        if (lower === 'and') {
          tokens.push({ type: 'AND' });
        } else if (lower === 'or') {
          tokens.push({ type: 'OR' });
        } else if (lower === 'not') {
          tokens.push({ type: 'NOT' });
        } else {
          tokens.push({ type: 'STRING', value: val });
        }
        continue;
      }

      // Unknown char
      i++;
    }

    tokens.push({ type: 'EOF' });
    return tokens;
  }

  // Parser
  private expression(): ASTNode {
    return this.or();
  }

  private or(): ASTNode {
    let expr = this.and();

    while (this.match('OR')) {
      const right = this.and();
      expr = { type: 'OR', left: expr, right };
    }

    return expr;
  }

  private and(): ASTNode {
    let expr = this.unary();

    while (this.match('AND')) {
      const right = this.unary();
      expr = { type: 'AND', left: expr, right };
    }

    return expr;
  }

  private unary(): ASTNode {
    if (this.match('NOT')) {
      const right = this.unary();
      return { type: 'NOT', expr: right };
    }
    return this.primary();
  }

  private primary(): ASTNode {
    if (this.match('LPAREN')) {
      const expr = this.expression();
      this.consume('RPAREN');
      return expr;
    }

    if (this.check('TAG')) {
      const token = this.advance();
      return { type: 'TAG', value: token.value };
    }

    if (this.check('PROPERTY')) {
      const token = this.advance();

      if (this.match('EQUALS')) {
        const valueToken = this.consumeValueToken();
        if (valueToken) {
          return {
            type: 'PROPERTY_EQUALS',
            property: token.value,
            value: valueToken.value,
          };
        }
      }

      return { type: 'PROPERTY_EXISTS', property: token.value };
    }

    if (this.check('STRING')) {
      const token = this.advance();
      return { type: 'STRING', value: token.value };
    }

    // Default / Error recovery
    // If we hit here, likely unexpected token.
    // Return a safe "true" node or throw.
    // For robustness, return an empty node that evaluates to false or true?
    // Let's consume one token to avoid infinite loop if strictly needed,
    // but since we check tokens, we might just be at EOF or invalid.
    if (!this.isAtEnd()) {
      this.advance();
    }
    return { type: 'TRUE' };
  }

  // Helpers
  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.tokens[this.current].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType) {
    if (this.check(type)) return this.advance();
    return null;
  }

  private consumeValueToken(): Token | null {
    if (this.check('STRING') || this.check('TAG') || this.check('PROPERTY')) {
      return this.advance();
    }
    return null;
  }

  private isAtEnd(): boolean {
    return this.tokens[this.current].type === 'EOF';
  }

  // Evaluator
  private evaluate(node: ASTNode, file: TFile): boolean {
    if (!node) return true;

    switch (node.type) {
      case 'OR':
        return this.evaluate(node.left!, file) || this.evaluate(node.right!, file);
      case 'AND':
        return this.evaluate(node.left!, file) && this.evaluate(node.right!, file);
      case 'NOT':
        return !this.evaluate(node.expr!, file);
      case 'TAG':
        return this.hasTag(file, node.value!);
      case 'PROPERTY_EXISTS':
        return this.hasProperty(file, node.property!);
      case 'PROPERTY_EQUALS':
        return this.propertyEquals(file, node.property!, node.value!);
      case 'STRING':
        return this.isPath(file, node.value!);
      case 'TRUE':
        return true;
      default:
        return true;
    }
  }

  private hasTag(file: TFile, tag: string): boolean {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache) return false;

    const allTags = getAllTags(cache);
    if (!allTags) return false;

    // Normalize tag: ensure it starts with #
    const searchTag = tag.startsWith('#') ? tag : '#' + tag;

    return allTags.some(t => {
      // getAllTags returns tags like "#tag", so we check exact match or sub-tag
      return t === searchTag || t.startsWith(searchTag + '/');
    });
  }

  private getFrontmatter(file: TFile): FrontMatterCache | null {
    const cache = this.app.metadataCache.getFileCache(file);
    return cache?.frontmatter ?? null;
  }

  private hasProperty(file: TFile, property: string): boolean {
    const frontmatter = this.getFrontmatter(file);
    if (!frontmatter) return false;

    return Object.prototype.hasOwnProperty.call(frontmatter, property);
  }

  private propertyEquals(file: TFile, property: string, expectedValue: string): boolean {
    const frontmatter = this.getFrontmatter(file);
    if (!frontmatter || !Object.prototype.hasOwnProperty.call(frontmatter, property)) {
      return false;
    }

    const actualValue = frontmatter[property];
    return this.matchesFrontmatterValue(actualValue, expectedValue);
  }

  private matchesFrontmatterValue(actualValue: unknown, expectedValue: string): boolean {
    if (actualValue == null) return false;

    if (Array.isArray(actualValue)) {
      return actualValue.some(value => this.matchesFrontmatterValue(value, expectedValue));
    }

    if (typeof actualValue === 'boolean') {
      const normalized = expectedValue.toLowerCase();
      if (normalized !== 'true' && normalized !== 'false') return false;
      return actualValue === (normalized === 'true');
    }

    if (typeof actualValue === 'number') {
      const expectedNumber = Number(expectedValue);
      return Number.isFinite(expectedNumber) && actualValue === expectedNumber;
    }

    if (typeof actualValue === 'string') {
      return actualValue === expectedValue;
    }

    return false;
  }

  private isPath(file: TFile, path: string): boolean {
    // Simple prefix match for folder or file
    // "folder" matches "folder/file.md"
    // "file.md" matches "file.md" (if at root) or "folder/file.md" ??
    // Dataview behavior:
    // FROM "folder" -> path starts with "folder"
    // FROM "file" -> path is exactly "file" or ends with?
    // Usually path matching is strictly prefix in Dataview for folders.
    // But if I say "Daily/2023", it matches "Daily/2023-01.md".
    return file.path.startsWith(path);
  }
}
