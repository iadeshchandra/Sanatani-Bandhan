/**
 * translatorShadow.test.ts — pins the translator-shadow disease (QUEUED #62b).
 *
 * Disease: a binding named `t` (callback parameter, loop variable, local
 * const, destructured value) declared in a scope where the i18n translator
 * `t` is visible, where code inside that scope CALLS `t('...')` — the call
 * lands on the shadow value (a task object, a string, a timer id...) and
 * throws `TypeError: t is not a function` at render/event time. This is the
 * exact crash that lived in src/utsav/CommitteeTab.tsx: `tasks.map((t) => …)`
 * shadowed the translator, and the row's aria-label / assigned-to / due /
 * delete-toast / hint calls invoked the Task object as a function.
 *
 * Method: TypeScript AST scope walk (regex cannot do this — 17 files carry
 * harmless `t` params that never invoke the translator and must NOT fail).
 * A binding is a finding only when its scope subtree contains a `t(...)`
 * call that resolves to the shadow:
 *  - parameters: calls counted in the function body, stopping at deeper
 *    re-bindings of `t`;
 *  - variables: calls counted after the declaration, inside the variable's
 *    own scope (the enclosing block; a for/for-of/for-in initializer's
 *    scope is the loop statement alone).
 * Translator bindings recognised: `const { t } = useXxx()` destructuring,
 * `useXxx().t`, a local `const t = (key) => …` translator, and a props
 * parameter whose props type declares `t` as a function type.
 * Harmless shadows (translator never invoked inside the shadow scope) are
 * deliberately allowed — see the #62b NOTES inventory.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

function bindingNames(nameNode: ts.BindingName): { name: string; node: ts.Node }[] {
  const out: { name: string; node: ts.Node }[] = [];
  const walk = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) out.push({ name: n.text, node: n });
    else if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n)) n.elements.forEach(walk);
    else if (ts.isBindingElement(n)) walk(n.name);
  };
  walk(nameNode);
  return out;
}

function bindsT(nameNode: ts.BindingName): boolean {
  return bindingNames(nameNode).some((b) => b.name === 't');
}

function isHookCall(node: ts.Node): boolean {
  return (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    /^use[A-Z]/.test(node.expression.text)
  );
}

function isTranslatorDecl(node: ts.Node): boolean {
  if (!ts.isVariableDeclaration(node) || !node.initializer) return false;
  const init = node.initializer;
  if (
    ts.isIdentifier(node.name) &&
    node.name.text === 't' &&
    (ts.isArrowFunction(init) || ts.isFunctionExpression(init))
  ) {
    return true; // local translator definition
  }
  const initIsHookCall =
    isHookCall(init) ||
    (ts.isPropertyAccessExpression(init) && isHookCall(init.expression));
  if (!initIsHookCall) return false;
  if (ts.isIdentifier(node.name)) {
    return node.name.text === 't' && ts.isPropertyAccessExpression(init);
  }
  if (ts.isObjectBindingPattern(node.name)) {
    return node.name.elements.some(
      (el) =>
        ts.isBindingElement(el) &&
        ts.isIdentifier(el.name) &&
        el.name.text === 't' &&
        (!el.propertyName || (ts.isIdentifier(el.propertyName) && el.propertyName.text === 't'))
    );
  }
  return false;
}

interface Finding {
  line: number;
  what: string;
}

type FunctionScope =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

function isFunctionScope(node: ts.Node): node is FunctionScope {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function statementsOf(node: ts.Node): readonly ts.Statement[] | null {
  if (ts.isBlock(node)) return node.statements;
  if (ts.isSourceFile(node)) return node.statements;
  if (ts.isCaseClause(node) || ts.isDefaultClause(node)) return node.statements;
  if (ts.isModuleBlock(node)) return node.statements;
  return null;
}

function analyzeFile(filePath: string, text: string): Finding[] {
  const kind = filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, kind);
  const lineOf = (node: ts.Node): number =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
  const findings: Finding[] = [];
  let hasTranslatorBinding = false;

  // In-file type declarations (props-translator resolution).
  const typeMap = new Map<string, readonly ts.TypeElement[]>();
  const collectTypes = (node: ts.Node): void => {
    if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) && node.name) {
      const members = ts.isInterfaceDeclaration(node)
        ? node.members
        : ts.isTypeLiteralNode(node.type)
          ? node.type.members
          : null;
      if (members) typeMap.set(node.name.text, members);
    }
    ts.forEachChild(node, collectTypes);
  };
  collectTypes(sf);

  const typeDeclaresTFunction = (typeNode: ts.TypeNode | undefined): boolean => {
    if (!typeNode) return false;
    let members: readonly ts.TypeElement[] | null = null;
    if (ts.isTypeLiteralNode(typeNode)) members = typeNode.members;
    else if (ts.isTypeReferenceNode(typeNode)) {
      const tn = typeNode.typeName;
      const simpleName = ts.isIdentifier(tn) ? tn.text : tn.right.text;
      members = typeMap.get(simpleName) || null;
      if (!members && typeNode.typeArguments && typeNode.typeArguments.length > 0) {
        return typeDeclaresTFunction(typeNode.typeArguments[0]);
      }
    }
    if (!members) return false;
    return members.some(
      (m) =>
        ts.isPropertySignature(m) &&
        !!m.name &&
        ts.isIdentifier(m.name) &&
        m.name.text === 't' &&
        !!m.type &&
        ts.isFunctionTypeNode(m.type)
    );
  };

  const translatorDecls = new Set<ts.Node>();
  const translatorParams = new Set<ts.Node>();
  const findTranslators = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && isTranslatorDecl(node)) {
      translatorDecls.add(node);
      hasTranslatorBinding = true;
    }
    ts.forEachChild(node, findTranslators);
  };
  findTranslators(sf);

  const findPropTranslators = (node: ts.Node, varType: ts.TypeNode | undefined): void => {
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      findPropTranslators(node.initializer, node.type || varType);
      return;
    }
    if (ts.isFunctionLike(node)) {
      for (const p of node.parameters) {
        if (!ts.isObjectBindingPattern(p.name)) continue;
        if (!bindsT(p.name)) continue;
        if (typeDeclaresTFunction(p.type || varType)) {
          translatorParams.add(p);
          hasTranslatorBinding = true;
        }
      }
    }
    ts.forEachChild(node, (c) => findPropTranslators(c, undefined));
  };
  findPropTranslators(sf, undefined);
  if (!hasTranslatorBinding) return findings;

  // Count t(...) calls in a subtree, stopping at deeper re-bindings of `t`.
  // minPos: only count calls starting after this position (variable case).
  const countCalls = (root: ts.Node, minPos: number): { count: number; lines: number[] } => {
    let count = 0;
    const lines: number[] = [];
    const visit = (node: ts.Node, isRootNode: boolean): void => {
      if (!isRootNode) {
        if (ts.isFunctionLike(node) && node.parameters.some((p) => bindsT(p.name))) {
          return; // deeper shadow owns its body
        }
        if (ts.isVariableDeclaration(node) && bindsT(node.name) && !translatorDecls.has(node)) {
          return;
        }
      }
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 't' &&
        node.getStart(sf) > minPos
      ) {
        count++;
        lines.push(lineOf(node));
      }
      ts.forEachChild(node, (c) => visit(c, false));
    };
    visit(root, true);
    return { count, lines };
  };

  // Variable scope root: loop statement for for/for-of/for-in initializers,
  // else the nearest enclosing block / source file.
  const scopeRootFor = (decl: ts.VariableDeclaration): ts.Node => {
    const list = decl.parent;
    if (
      list &&
      (ts.isForStatement(list.parent) ||
        ts.isForOfStatement(list.parent) ||
        ts.isForInStatement(list.parent))
    ) {
      return list.parent;
    }
    let p: ts.Node | undefined = decl.parent;
    while (p) {
      if (ts.isBlock(p) || ts.isSourceFile(p) || ts.isCaseBlock(p) || ts.isModuleBlock(p)) return p;
      p = p.parent;
    }
    return sf;
  };

  const reviewVars: ts.VariableDeclaration[] = [];

  function walkChildren(node: ts.Node, translatorVisible: boolean): void {
    let visible = translatorVisible;
    const children: ts.Node[] = [];
    ts.forEachChild(node, (c) => {
      children.push(c);
    });
    const stmts = statementsOf(node);
    for (const child of children) {
      walkScope(child, visible);
      if (stmts && ts.isVariableStatement(child)) {
        for (const d of child.declarationList.declarations) {
          if (translatorDecls.has(d)) visible = true;
          else if (bindsT(d.name)) visible = false;
        }
      }
    }
  }

  function walkScope(node: ts.Node, translatorVisible: boolean): void {
    if (isFunctionScope(node)) {
      for (const p of node.parameters) {
        if (translatorParams.has(p)) continue;
        if (!bindsT(p.name)) continue;
        if (translatorVisible && node.body) {
          const { count, lines } = countCalls(node.body, -1);
          if (count > 0) {
            findings.push({
              line: lineOf(p),
              what: `parameter named 't' shadows the translator and is invoked as the translator at line(s) ${lines.join(', ')}`,
            });
          }
        }
      }
      const hasTranslatorParam = node.parameters.some((p) => translatorParams.has(p));
      const hasShadowParam = node.parameters.some(
        (p) => !translatorParams.has(p) && bindsT(p.name)
      );
      const innerVisible = hasTranslatorParam ? true : hasShadowParam ? false : translatorVisible;
      if (node.body) walkScope(node.body, innerVisible);
      return;
    }
    if (ts.isVariableDeclaration(node)) {
      if (bindsT(node.name) && !translatorDecls.has(node) && translatorVisible) {
        reviewVars.push(node);
      }
      if (node.initializer) walkScope(node.initializer, translatorVisible);
      return;
    }
    if (ts.isCatchClause(node) && node.variableDeclaration) {
      if (bindsT(node.variableDeclaration.name) && translatorVisible) {
        const { count, lines } = countCalls(node.block, -1);
        if (count > 0) {
          findings.push({
            line: lineOf(node),
            what: `catch variable named 't' shadows the translator and is invoked as the translator at line(s) ${lines.join(', ')}`,
          });
        }
      }
      walkChildren(node.block, bindsT(node.variableDeclaration.name) ? false : translatorVisible);
      return;
    }
    walkChildren(node, translatorVisible);
  }

  walkScope(sf, false);

  // Refine variable shadows: genuine only if a t(...) call after the
  // declaration resolves to the local (inside its own scope).
  for (const decl of reviewVars) {
    const root = scopeRootFor(decl);
    const { count, lines } = countCalls(root, decl.getEnd());
    if (count > 0) {
      findings.push({
        line: lineOf(decl),
        what: `local variable named 't' shadows the translator and is invoked as the translator at line(s) ${lines.join(', ')}`,
      });
    }
  }

  return findings;
}

function collectSources(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      collectSources(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
}

describe('translator shadowing (QUEUED #62b)', () => {
  it(
    'no binding named t shadows the i18n translator and is invoked as the translator, anywhere in src',
    () => {
      const srcRoot = path.resolve(__dirname, '..', '..');
      const files: string[] = [];
      collectSources(srcRoot, files);
      const problems: string[] = [];
      for (const file of files) {
        const text = fs.readFileSync(file, 'utf8');
        if (!/\bt\s*\(/.test(text)) continue;
        for (const f of analyzeFile(file, text)) {
          problems.push(`${path.relative(srcRoot, file)}:${f.line} — ${f.what}`);
        }
      }
      expect(problems).toEqual([]);
    },
    180000
  );
});
