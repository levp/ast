/**
 * Represents a single lexical token in an expression.
 */
class Token {
    public value: any;
    public type: TokenType;

    /**
     * Creates a new token with the specified value. The type of the token is determined automatically.
     * @throws {TypeError} If the value does not correspond to a valid TokenType.
     */
    constructor(value: any) {
        this.type = Token.resolveType(value);
        this.value = value;
        // Immutable
        Object.freeze(this);
    }

    private static resolveType(value: any): TokenType {
        if (typeof value === "number") {
            return TokenType.Number;
        }
        if (value instanceof Operator) {
            return TokenType.Operator;
        }
        if (value === "(") {
            return TokenType.LeftParenthesis;
        }
        if (value === ")") {
            return TokenType.RightParenthesis;
        }
        if (value === ",") {
            return TokenType.ArgumentSeparator;
        }
        if (typeof value === "function") {
            return TokenType.Function;
        }
        // Invalid type
        throw new TypeError("Unknown token type.");
    }

    /**
     * @override
     */
    public toString(): string {
        return `Token{${this.value}}`
    }
}