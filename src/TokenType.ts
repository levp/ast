/**
 * An enumeration of recognizable and distinguishable token types.
 */
enum TokenType {
    /**
     * A numeric value.
     */
    Number,
    /**
     * An operator.
     */
    Operator,
    /**
     * A left (opening) parenthesis, '('.
     */
    LeftParenthesis,
    /**
     * A right (closing) parenthesis, ')'.
     */
    RightParenthesis,
    /**
     * A function.
     */
    Function,
    /**
     * A token used to separate function arguments.
     */
    ArgumentSeparator
}