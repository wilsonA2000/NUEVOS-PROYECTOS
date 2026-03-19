/**
 * Custom ts-jest AST transformer that replaces import.meta.env with process.env
 * This allows Jest to handle Vite's import.meta.env references.
 */
const ts = require('typescript');

const importMetaTransformer = {
  version: 1,
  name: 'import-meta-env-transformer',
  factory(cs) {
    return (ctx) => {
      return (sourceFile) => {
        function visitor(node) {
          // Replace import.meta.env.XXX with process.env.XXX
          if (
            ts.isPropertyAccessExpression(node) &&
            ts.isPropertyAccessExpression(node.expression) &&
            ts.isMetaProperty(node.expression.expression) &&
            node.expression.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
            node.expression.name.text === 'env'
          ) {
            return ts.factory.createPropertyAccessExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier('process'),
                ts.factory.createIdentifier('env')
              ),
              node.name
            );
          }

          // Replace import.meta.env with process.env
          if (
            ts.isPropertyAccessExpression(node) &&
            ts.isMetaProperty(node.expression) &&
            node.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
            node.name.text === 'env'
          ) {
            return ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier('process'),
              ts.factory.createIdentifier('env')
            );
          }

          return ts.visitEachChild(node, visitor, ctx);
        }

        return ts.visitNode(sourceFile, visitor);
      };
    };
  },
};

module.exports = importMetaTransformer;
