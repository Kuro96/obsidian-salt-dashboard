import { TFile, App, FrontMatterCache, getAllTags } from 'obsidian';

type TokenType =
  | 'AND'
  | 'OR'
  | 'NOT'
  | 'LPAREN'
  | 'RPAREN'
  | 'TAG'
  | 'BRACKET_FILTER'
  | 'STRING'
  | 'EOF';

interface Token {
  type: TokenType;
  value?: string;
  property?: string; // for BRACKET_FILTER
  valueExpr?: string | null; // for BRACKET_FILTER: null = no colon clause
}

interface ASTNode {
  type: string;
  left?: ASTNode;
  right?: ASTNode;
  expr?: ASTNode;
  value?: string;
  property?: string;
  valueExpr?: string;
}

// ── Value sub-expression matcher ──────────────────────────────────────────────
// Used to evaluate the expression inside [property:expr].
// Supports: OR / AND / NOT / () / unquoted words / "quoted" / /regex/flags

type VTokenType = 'AND' | 'OR' | 'NOT' | 'LPAREN' | 'RPAREN' | 'WORD' | 'REGEX' | 'EOF';

interface VToken {
  type: VTokenType;
  value?: string; // for WORD
  exact?: boolean; // true = quoted → exact match; false = case-insensitive
  pattern?: string; // for REGEX
  flags?: string; // for REGEX
}

interface VNode {
  type: string;
  left?: VNode;
  right?: VNode;
  expr?: VNode;
  value?: string;
  exact?: boolean;
  pattern?: string;
  flags?: string;
}

class ValueMatcher {
  private tokens: VToken[] = [];
  private pos = 0;

  test(expr: string, actualValue: unknown): boolean {
    try {
      this.tokens = this.tokenize(expr);
      this.pos = 0;
      const ast = this.expression();
      return this.evaluate(ast, actualValue);
    } catch {
      return false;
    }
  }

  private tokenize(expr: string): VToken[] {
    const tokens: VToken[] = [];
    let i = 0;

    while (i < expr.length) {
      const c = expr[i];

      if (/\s/.test(c)) {
        i++;
        continue;
      }
      if (c === '(') {
        tokens.push({ type: 'LPAREN' });
        i++;
        continue;
      }
      if (c === ')') {
        tokens.push({ type: 'RPAREN' });
        i++;
        continue;
      }

      if (c === '!' || (c === '-' && (i + 1 >= expr.length || /[\s("'/]/.test(expr[i + 1])))) {
        tokens.push({ type: 'NOT' });
        i++;
        continue;
      }

      // Quoted string → exact match
      if (c === '"' || c === "'") {
        const q = c;
        let val = '';
        i++;
        while (i < expr.length && expr[i] !== q) {
          if (expr[i] === '\\' && i + 1 < expr.length) {
            val += expr[i + 1];
            i += 2;
          } else {
            val += expr[i];
            i++;
          }
        }
        if (i < expr.length) i++; // closing quote
        tokens.push({ type: 'WORD', value: val, exact: true });
        continue;
      }

      // Regex: /pattern/flags
      if (c === '/') {
        let pattern = '';
        i++;
        while (i < expr.length && expr[i] !== '/') {
          if (expr[i] === '\\' && i + 1 < expr.length) {
            pattern += expr[i] + expr[i + 1];
            i += 2;
          } else {
            pattern += expr[i];
            i++;
          }
        }
        if (i < expr.length) i++; // closing /
        let flags = '';
        while (i < expr.length && /[gimsuy]/.test(expr[i])) {
          flags += expr[i];
          i++;
        }
        tokens.push({ type: 'REGEX', pattern, flags });
        continue;
      }

      // Unquoted word → case-insensitive exact match
      if (/\S/.test(c)) {
        let val = '';
        while (i < expr.length && !/[\s()]/.test(expr[i])) {
          val += expr[i];
          i++;
        }
        const lower = val.toLowerCase();
        if (lower === 'and') tokens.push({ type: 'AND' });
        else if (lower === 'or') tokens.push({ type: 'OR' });
        else if (lower === 'not') tokens.push({ type: 'NOT' });
        else tokens.push({ type: 'WORD', value: val, exact: false });
        continue;
      }

      i++;
    }

    tokens.push({ type: 'EOF' });
    return tokens;
  }

  private expression(): VNode {
    return this.or();
  }

  private or(): VNode {
    let node = this.and();
    while (this.match('OR')) node = { type: 'OR', left: node, right: this.and() };
    return node;
  }

  private and(): VNode {
    let node = this.unary();
    while (this.match('AND')) node = { type: 'AND', left: node, right: this.unary() };
    return node;
  }

  private unary(): VNode {
    if (this.match('NOT')) return { type: 'NOT', expr: this.unary() };
    return this.primary();
  }

  private primary(): VNode {
    if (this.match('LPAREN')) {
      const node = this.expression();
      this.consume('RPAREN');
      return node;
    }
    if (this.check('WORD') || this.check('REGEX')) {
      const t = this.advance();
      return t as VNode;
    }
    if (!this.isAtEnd()) this.advance();
    return { type: 'TRUE' };
  }

  private evaluate(node: VNode, actual: unknown): boolean {
    // For array values, any element satisfying the whole expression counts
    if (Array.isArray(actual)) {
      return actual.some(v => this.evaluate(node, v));
    }

    switch (node.type) {
      case 'OR':
        return this.evaluate(node.left!, actual) || this.evaluate(node.right!, actual);
      case 'AND':
        return this.evaluate(node.left!, actual) && this.evaluate(node.right!, actual);
      case 'NOT':
        return !this.evaluate(node.expr!, actual);
      case 'WORD': {
        const str = actual == null ? '' : String(actual);
        return node.exact
          ? str === node.value!
          : str.toLowerCase() === (node.value ?? '').toLowerCase();
      }
      case 'REGEX': {
        const str = actual == null ? '' : String(actual);
        try {
          return new RegExp(node.pattern!, node.flags ?? '').test(str);
        } catch {
          return false;
        }
      }
      case 'TRUE':
        return true;
      default:
        return false;
    }
  }

  private match(type: VTokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }
  private check(type: VTokenType): boolean {
    return !this.isAtEnd() && this.tokens[this.pos].type === type;
  }
  private advance(): VToken {
    if (!this.isAtEnd()) this.pos++;
    return this.tokens[this.pos - 1];
  }
  private consume(type: VTokenType): void {
    if (this.check(type)) this.advance();
  }
  private isAtEnd(): boolean {
    return this.tokens[this.pos].type === 'EOF';
  }
}

// ── Main SourceParser ─────────────────────────────────────────────────────────

export class SourceParser {
  private app: App;
  private tokens: Token[] = [];
  private current = 0;
  private valueMatcher = new ValueMatcher();

  constructor(app: App) {
    this.app = app;
  }

  public parse(source: string): (file: TFile) => boolean {
    if (!source || !source.trim()) return () => true;

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
      return () => false;
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

      // Bracket filter: [property] or [property:value-expr]
      if (char === '[') {
        i++; // skip [
        let inner = '';
        let depth = 0;
        while (i < source.length) {
          if (source[i] === '[') {
            depth++;
            inner += source[i++];
            continue;
          }
          if (source[i] === ']') {
            if (depth === 0) {
              i++;
              break;
            }
            depth--;
            inner += source[i++];
            continue;
          }
          // preserve quoted strings verbatim
          if (source[i] === '"' || source[i] === "'") {
            const q = source[i];
            inner += source[i++];
            while (i < source.length && source[i] !== q) {
              if (source[i] === '\\') inner += source[i++];
              inner += source[i++];
            }
            if (i < source.length) inner += source[i++];
            continue;
          }
          inner += source[i++];
        }

        const colonIdx = inner.indexOf(':');
        if (colonIdx === -1) {
          tokens.push({ type: 'BRACKET_FILTER', property: inner.trim(), valueExpr: null });
        } else {
          const prop = inner.slice(0, colonIdx).trim();
          const valExpr = inner.slice(colonIdx + 1).trim();
          tokens.push({ type: 'BRACKET_FILTER', property: prop, valueExpr: valExpr });
        }
        continue;
      }

      // NOT: ! or - (when - is a prefix operator, not part of a word)
      if (
        char === '!' ||
        (char === '-' && (i + 1 >= source.length || /[\s#("'[]/.test(source[i + 1])))
      ) {
        tokens.push({ type: 'NOT' });
        i++;
        continue;
      }

      // Quoted string
      if (char === '"' || char === "'") {
        const quote = char;
        let val = '';
        i++;
        while (i < source.length && source[i] !== quote) {
          if (source[i] === '\\' && i + 1 < source.length) {
            val += source[i + 1];
            i += 2;
          } else {
            val += source[i];
            i++;
          }
        }
        i++;
        tokens.push({ type: 'STRING', value: val });
        continue;
      }

      // Tag
      if (char === '#') {
        let val = '#';
        i++;
        while (i < source.length && !/[\s#(),!"'[\]]/.test(source[i])) {
          val += source[i];
          i++;
        }
        tokens.push({ type: 'TAG', value: val });
        continue;
      }

      // Word / identifier / path
      if (/[a-zA-Z0-9_\-/.]/.test(char)) {
        let val = '';
        while (i < source.length && /[a-zA-Z0-9_\-/.]/.test(source[i])) {
          val += source[i];
          i++;
        }
        const lower = val.toLowerCase();
        if (lower === 'and') tokens.push({ type: 'AND' });
        else if (lower === 'or') tokens.push({ type: 'OR' });
        else if (lower === 'not') tokens.push({ type: 'NOT' });
        else tokens.push({ type: 'STRING', value: val });
        continue;
      }

      i++;
    }

    tokens.push({ type: 'EOF' });
    return tokens;
  }

  // ── Parser ──────────────────────────────────────────────────────────────────

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
      return { type: 'NOT', expr: this.unary() };
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

    if (this.check('BRACKET_FILTER')) {
      const token = this.advance();
      const prop = token.property!;
      const valExpr = token.valueExpr;

      if (valExpr == null) {
        // [property] — exists
        return { type: 'PROPERTY_EXISTS', property: prop };
      }
      if (valExpr.toLowerCase() === 'null') {
        // [property:null] — exists but has no value
        return { type: 'PROPERTY_NULL', property: prop };
      }
      // [property:expr] — value matches sub-expression
      return { type: 'PROPERTY_MATCH', property: prop, valueExpr: valExpr };
    }

    if (this.check('STRING')) {
      const token = this.advance();
      return { type: 'STRING', value: token.value };
    }

    if (!this.isAtEnd()) this.advance();
    return { type: 'TRUE' };
  }

  // ── Token helpers ───────────────────────────────────────────────────────────

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

  private isAtEnd(): boolean {
    return this.tokens[this.current].type === 'EOF';
  }

  // ── Evaluator ───────────────────────────────────────────────────────────────

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
      case 'PROPERTY_NULL':
        return this.isPropertyNull(file, node.property!);
      case 'PROPERTY_MATCH':
        return this.propertyMatch(file, node.property!, node.valueExpr!);
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
    const searchTag = tag.startsWith('#') ? tag : '#' + tag;
    return allTags.some(t => t === searchTag || t.startsWith(searchTag + '/'));
  }

  private getFrontmatter(file: TFile): FrontMatterCache | null {
    const cache = this.app.metadataCache.getFileCache(file);
    return cache?.frontmatter ?? null;
  }

  private getFileProperty(file: TFile, property: string): string | undefined {
    switch (property.toLowerCase()) {
      case 'path':
        return file.path;
      case 'name':
        return file.name;
      case 'basename':
        return file.basename;
      case 'extension':
        return file.extension;
      default:
        return undefined;
    }
  }

  private hasProperty(file: TFile, property: string): boolean {
    if (this.getFileProperty(file, property) !== undefined) {
      return true;
    }

    const fm = this.getFrontmatter(file);
    return fm != null && Object.prototype.hasOwnProperty.call(fm, property);
  }

  private isPropertyNull(file: TFile, property: string): boolean {
    if (this.getFileProperty(file, property) !== undefined) {
      return false;
    }

    const fm = this.getFrontmatter(file);
    if (!fm || !Object.prototype.hasOwnProperty.call(fm, property)) return false;
    // Only true for YAML null / missing value — not for "" or []
    return fm[property] == null;
  }

  private propertyMatch(file: TFile, property: string, valueExpr: string): boolean {
    const fileProperty = this.getFileProperty(file, property);
    if (fileProperty !== undefined) {
      return this.valueMatcher.test(valueExpr, fileProperty);
    }

    const fm = this.getFrontmatter(file);
    if (!fm || !Object.prototype.hasOwnProperty.call(fm, property)) return false;
    const actual = fm[property];
    if (actual == null) return false;
    return this.valueMatcher.test(valueExpr, actual);
  }

  private isPath(file: TFile, path: string): boolean {
    return file.path.startsWith(path);
  }
}
