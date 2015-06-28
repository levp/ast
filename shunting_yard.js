/**
 * Represents a single lexical token in an expression.
 */
var Token = (function () {
    /**
     * Creates a new token with the specified value. The type of the token is determined automatically.
     * @throws {TypeError} If the value does not correspond to a valid TokenType.
     */
    function Token(value) {
        this.type = Token.resolveType(value);
        this.value = value;
        // Immutable
        Object.freeze(this);
    }
    Token.resolveType = function (value) {
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
    };
    /**
     * @override
     */
    Token.prototype.toString = function () {
        return "Token{" + this.value + "}";
    };
    return Token;
})();
/**
 * An enumeration of recognizable and distinguishable token types.
 */
var TokenType;
(function (TokenType) {
    /**
     * A numeric value.
     */
    TokenType[TokenType["Number"] = 0] = "Number";
    /**
     * An operator.
     */
    TokenType[TokenType["Operator"] = 1] = "Operator";
    /**
     * A left (opening) parenthesis, '('.
     */
    TokenType[TokenType["LeftParenthesis"] = 2] = "LeftParenthesis";
    /**
     * A right (closing) parenthesis, ')'.
     */
    TokenType[TokenType["RightParenthesis"] = 3] = "RightParenthesis";
    /**
     * A function.
     */
    TokenType[TokenType["Function"] = 4] = "Function";
    /**
     * A token used to separate function arguments.
     */
    TokenType[TokenType["ArgumentSeparator"] = 5] = "ArgumentSeparator";
})(TokenType || (TokenType = {}));
/**
 * Represents an operator that can produce a value using one or two operands.
 */
var Operator = (function () {
    function Operator(precedence, symbol, isLeftAssociative, func) {
        this.precedence = precedence;
        this.symbol = symbol;
        this.isLeftAssociative = isLeftAssociative;
        this.length = func.length;
        this.func = func;
        // Immutable
        Object.freeze(this);
        Operator.register(this);
    }
    /**
     * @override
     */
    Operator.prototype.toString = function () {
        return "Op{'" + this.symbol + "'}";
    };
    Operator.parse = function (expr, startIndex) {
        for (var _i = 0, _a = Operator.dictionary; _i < _a.length; _i++) {
            var entry = _a[_i];
            var endIndex = startIndex + entry.symbolLength;
            if (endIndex > expr.length) {
                // Operators with symbols as long or longer than this
                // cannot be present in the expression at the specified
                // index, as there are not enough characters left.
                continue;
            }
            // Creating sub-strings can be avoided, for example by using
            // hashes, but this naive solution should be enough for now.
            var testedString = expr.substring(startIndex, endIndex);
            var map = entry.opMap;
            if (map.hasOwnProperty(testedString)) {
                // Operator parsed!
                return map[testedString];
            }
        }
        // No such operator found
        return null;
    };
    Operator.register = function (op) {
        var dic = Operator.dictionary;
        var entry = null;
        // 1. Check if there is already an entry in the dictionary
        //    for operators of this symbol-length.
        var opLength = op.symbol.length;
        for (var _i = 0; _i < dic.length; _i++) {
            var e = dic[_i];
            if (e.symbolLength === opLength) {
                entry = e;
            }
        }
        // 2. If an entry was not found, it means that this is the
        //    first operator with such a symbol length, and an entry
        //    should be created for it.
        if (!entry) {
            entry = {
                symbolLength: opLength,
                opMap: {}
            };
            dic.push(entry);
            // Keep the dictionary sorted in descending order
            // (Binary insertion could be used instead)
            dic.sort(function (a, b) { return b.symbolLength - a.symbolLength; });
        }
        // 3. Add operator to map.
        var map = entry.opMap;
        var symbol = op.symbol;
        if (map.hasOwnProperty(symbol)) {
            throw new Error("Operator symbols must be unique.");
        }
        map[symbol] = op;
    };
    /**
     * An array of symbol-operator maps, each map only storing operators with the same symbol length.
     * The array is kept ordered by the symbol length.
     * This is used to allow operator symbols to be sub-strings of other operator symbols.
     */
    Operator.dictionary = [];
    return Operator;
})();
// Create operators
new Operator(0, '+', true, function (a, b) { return a + b; });
new Operator(0, '-', true, function (a, b) { return a - b; });
new Operator(1, '*', true, function (a, b) { return a * b; });
new Operator(1, '/', true, function (a, b) { return a / b; });
new Operator(1, '%', true, function (a, b) { return a % b; });
new Operator(2, '**', false, Math.pow);
new Operator(3, '~', false, function (a) { return -a; });
var Tokenizer;
(function (Tokenizer) {
    /**
     * Breaks apart an expression into an array of individual tokens.
     * @param expr The expression to tokenize.
     */
    function tokenize(expr) {
        var tokenList = [];
        var i = 0;
        while (i < expr.length) {
            var charCode = expr.charCodeAt(i);
            // Ignore whitespace characters
            // (Not thorough as /\s/, but good enough for now
            //  since it avoids allocating sub-strings)
            if (charCode === " ".charCodeAt(0) ||
                charCode === "\n".charCodeAt(0) ||
                charCode === "\r".charCodeAt(0) ||
                charCode === "\t".charCodeAt(0) // tab
            ) {
                i++;
                continue;
            }
            // Read the next token
            var info = readToken(expr, i);
            if (info === null) {
                throw new Error("Unexpected token or symbol: '" + expr.charAt(i) + "'.");
            }
            // Add to token list
            tokenList.push(info.token);
            // Increment index by the number of characters read,
            // as we obviously don't want to the same characters
            // to be read as part of two different tokens.
            i += info.charsRead;
        }
        return tokenList;
    }
    Tokenizer.tokenize = tokenize;
    /**
     * Parses a token from an expression at the specified index.
     */
    function readToken(expr, index) {
        // 1. Try to read a number
        var info = readNumber(expr, index);
        if (info !== null) {
            // Number successfully parsed
            return info;
        }
        // 2. Try to read an operator
        var op = Operator.parse(expr, index);
        if (op !== null) {
            // Yup, it's an operator
            return {
                token: new Token(op),
                charsRead: op.symbol.length
            };
        }
        // 3. Parenthesis or an argument separator
        var char = expr.charAt(index);
        if (char === "(" || char === ")" || char === ",") {
            return {
                token: new Token(char),
                charsRead: 1
            };
        }
        // 4. A function
        info = readFunction(expr, index);
        if (info !== null) {
            return info;
        }
        // No token could be read
        return null;
    }
    /**
     * A rather simple custom number parsing function.
     * This is used to avoid the many idiosyncrasies of the native parsing methods, and to reliably keep track of how
     * many characters of the string were actually parsed.
     */
    function readNumber(expr, index) {
        // A flag used to keep track of whether a
        // decimal mark has been encountered.
        var decimalMark = 0;
        var i;
        for (i = index; i < expr.length; i++) {
            var charCode = expr.charCodeAt(i);
            if (charCode === ".".charCodeAt(0)) {
                // Decimal mark
                if (decimalMark === 1) {
                    // Second decimal mark encountered
                    break;
                }
                decimalMark = 1;
            }
            else if (charCode < "0".charCodeAt(0) || charCode > "9".charCodeAt(0)) {
                // Not a digit
                break;
            }
        }
        // Number of characters read while parsing the number
        var charsRead = i - index;
        if (charsRead - decimalMark === 0) {
            // No digits encountered while parsing, meaning
            // there is no number at the specified index in
            // the expression.
            return null;
        }
        // Numeric digits were encountered; parse the
        // characters that were read.
        var parsedNumber = Number(expr.substr(index, charsRead));
        return { token: new Token(parsedNumber), charsRead: charsRead };
    }
    function readFunction(expr, index) {
        // First character must be alphabetic
        if (!isAlphabetic(expr, index)) {
            return null;
        }
        var i;
        for (i = index + 1; i < expr.length; i++) {
            if (!isAlphaNumeric(expr, i)) {
                break;
            }
        }
        var functionName = expr.substring(index, i);
        if (!FunctionMap.hasOwnProperty(functionName)) {
            console.log(functionName);
            // No function with such a name exists
            return null;
        }
        return {
            token: new Token(FunctionMap[functionName]),
            charsRead: i - index
        };
    }
    function isAlphabetic(str, index) {
        var charCode = str.charCodeAt(index);
        return (charCode >= "a".charCodeAt(0) && charCode <= "z".charCodeAt(0))
            || (charCode >= "A".charCodeAt(0) && charCode <= "Z".charCodeAt(0));
    }
    function isAlphaNumeric(str, index) {
        var charCode = str.charCodeAt(index);
        return charCode >= "0".charCodeAt(0) && charCode <= "9".charCodeAt(0)
            || (charCode >= "a".charCodeAt(0) && charCode <= "z".charCodeAt(0))
            || (charCode >= "A".charCodeAt(0) && charCode <= "Z".charCodeAt(0));
    }
})(Tokenizer || (Tokenizer = {}));
/**
 * Contains all recognizable functions mapped to their names.
 */
var FunctionMap = {
    max: function max(a, b) {
        return (a > b) ? a : b;
    },
    min: function min(a, b) {
        return (a < b) ? a : b;
    },
    rand: function rand() {
        return Math.random();
    },
    floor: function floor(a) {
        return Math.floor(a);
    },
    ceil: function ceil(a) {
        return Math.ceil(a);
    },
    round: function round(a) {
        return Math.round(a);
    },
};
/**
 * An expression node which is part of an abstract syntax tree.
 */
var ExprNode = (function () {
    function ExprNode(token, children) {
        this.token = token;
        this.children = children;
        // Immutable
        Object.freeze(this);
    }
    ExprNode.prototype.evaluate = function () {
        var token = this.token;
        if (token.type === TokenType.Number) {
            return token.value;
        }
        var func;
        if (token.type === TokenType.Operator) {
            func = token.value.func;
        }
        else if (token.type === TokenType.Function) {
            func = token.value;
        }
        else {
            throw new Error("Unexpected token type.");
        }
        var args = this.children.map(function (child) { return child.evaluate(); });
        return func.apply(null, args);
    };
    return ExprNode;
})();
var AST;
(function (AST) {
    function create(tokens) {
        var exprStack = [];
        var opStack = [];
        for (var _i = 0; _i < tokens.length; _i++) {
            var token = tokens[_i];
            switch (token.type) {
                // ==================================================================
                // [Case 1] Token is a number.
                // ==================================================================
                case TokenType.Number:
                    // Token is a number, add it to the output queue
                    exprStack.push(new ExprNode(token));
                    break;
                // ==================================================================
                // [Case 2] Token is a left parenthesis.
                // ==================================================================
                case TokenType.LeftParenthesis:
                    // Push it onto the stack
                    opStack.push(token);
                    break;
                // ==================================================================
                // [Case 3] Token is a right parenthesis.
                // ==================================================================
                case TokenType.RightParenthesis:
                    while (true) {
                        if (opStack.length == 0) {
                            // The stack ran out of operators before we could find a left parenthesis
                            // that matches the current right parenthesis, which means there are
                            // mismatched parentheses in the expression.
                            throw new Error("Mismatched right parenthesis, ')'.");
                        }
                        if (peek(opStack).type === TokenType.LeftParenthesis) {
                            // Found the matching left parenthesis to the current right parenthesis.
                            // Pop it off the stack, but NOT onto the output list since parenthesis
                            // should not appear in the resulting AST.
                            opStack.pop();
                            // If the token at the top of the stack is a function token, pop it onto
                            // the output queue.
                            if (peek(opStack).type === TokenType.Function) {
                                popOperator(opStack, exprStack);
                            }
                            break;
                        }
                        // Pop operators off the stack onto the output queue until we find
                        // the left parenthesis matching the current right parenthesis.
                        popOperator(opStack, exprStack);
                    }
                    break;
                // ==================================================================
                // [Case 4] Token is an operator.
                // ==================================================================
                case TokenType.Operator:
                    var op = token.value;
                    // Start popping all tokens off the top of the stack until
                    // at least one of the following conditions is met:
                    // [1] Stack runs out of tokens
                    // [2] Popped token is not an operator (eg. parentheses)
                    // [3] Current operator is LEFT-associative with precedence
                    //     LESS OR EQUAL to that of the popped operator.
                    // [4] Current operator is RIGHT-associative with precedence
                    //     LESS than that of the popped operator.
                    while (opStack.length > 0) {
                        var nextOp = opStack[opStack.length - 1];
                        if (nextOp.type !== TokenType.Operator) {
                            // [2]
                            break;
                        }
                        if (op.isLeftAssociative && op.precedence > nextOp.value.precedence) {
                            // [3]
                            break;
                        }
                        if (!op.isLeftAssociative && op.precedence >= nextOp.value.precedence) {
                            // [4]
                            break;
                        }
                        // Pop into the output
                        popOperator(opStack, exprStack);
                    } // end while
                    // Push the operator onto the stack
                    opStack.push(token);
                    break;
                // ==================================================================
                // [Case 5] Token is am argument separator.
                // ==================================================================
                case TokenType.ArgumentSeparator:
                    // Until the token at the top of the stack is a left parenthesis,
                    // pop operators off the stack onto the output queue. If no left
                    // parenthesis is encountered, either the separator was misplaced
                    // or parentheses were mismatched.
                    while (true) {
                        var nextOp = peek(opStack);
                        if (nextOp.type === TokenType.LeftParenthesis) {
                            break;
                        }
                        exprStack.push(new ExprNode(opStack.pop()));
                    }
                    break;
                // ==================================================================
                // [Case 6] Token is a function.
                // ==================================================================
                case TokenType.Function:
                    opStack.push(token);
                    break;
                // ==================================================================
                // [Error] Bad token type
                // ==================================================================
                default:
                    throw new Error("Unknown token type.");
            } // end switch
        } // end for
        // Pop remaining operators to the output list
        while (opStack.length > 0) {
            var next = peek(opStack);
            if (next.type === TokenType.LeftParenthesis) {
                // Mismatched left parenthesis
                throw new Error("Mismatched left parenthesis, '('.");
            }
            popOperator(opStack, exprStack);
        }
        return exprStack.pop();
    }
    AST.create = create;
    function popOperator(opStack, exprStack) {
        var token = opStack.pop();
        console.log(opStack, exprStack);
        if (token.type !== TokenType.Function && token.type !== TokenType.Operator) {
            throw new Error("Invalid operator or function token.");
        }
        var argCount = token.value.length;
        // (Token value is either an Operator or a function)
        if (argCount > exprStack.length) {
            throw new Error("Not enough expressions on the stack.");
        }
        // Pop arguments
        var args = new Array(argCount);
        for (var i = argCount - 1; i >= 0; i--) {
            args[i] = exprStack.pop();
        }
        // Add new node
        exprStack.push(new ExprNode(token, args));
    }
    function peek(array) {
        return array[array.length - 1];
    }
})(AST || (AST = {}));
/// <reference path="Token.ts" />
/// <reference path="TokenType.ts" />
/// <reference path="Operator.ts" />
/// <reference path="Tokenizer.ts" />
/// <reference path="FunctionMap.ts" />
/// <reference path="ExprNode.ts" />
/// <reference path="AST.ts" /> 
//# sourceMappingURL=shunting_yard.js.map