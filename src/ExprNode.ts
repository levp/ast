/**
 * An expression node in an abstract syntax tree.
 */
class ExprNode {
    private token: Token;
    private children: ExprNode[];

    constructor(token: Token, children?: ExprNode[]) {
        this.token = token;
        this.children = children;
        // Immutable
        Object.freeze(this);
    }

    public evaluate(): number {
        const token = this.token;

        if (token.type === TokenType.Number) {
            return token.value;
        }

        let func: Function;
        if (token.type === TokenType.Operator) {
            func = token.value.func;
        } else if (token.type === TokenType.Function) {
            func = token.value;
        } else {
            throw new Error("Unexpected token type.");
        }

        const args = this.children.map(child => child.evaluate());
        return func.apply(null, args);
    }
}