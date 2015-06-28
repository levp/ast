module Tokenizer {
    /**
     * Represents the result of a Token parsing operation.
     * Contains the read token, as well as the number of characters that were parsed.
     */
    interface ParseInfo {
        token: Token;
        charsRead: number;
    }

    /**
     * Breaks apart an expression into an array of individual tokens.
     * @param expr The expression to tokenize.
     */
    export function tokenize(expr: string): Token[] {
        const tokenList: Token[] = [];

        let i = 0;
        while (i < expr.length) {
            const charCode = expr.charCodeAt(i);

            // Ignore whitespace characters
            // (Not thorough as /\s/, but good enough for now
            //  since it avoids allocating sub-strings)
            if (charCode === " ".charCodeAt(0) ||   // space
                charCode === "\n".charCodeAt(0) ||  // line feed
                charCode === "\r".charCodeAt(0) ||  // carriage return
                charCode === "\t".charCodeAt(0)  // tab
            ) {
                i++;
                continue;
            }

            // Read the next token
            const info = readToken(expr, i);

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

    /**
     * Parses a token from an expression at the specified index.
     */
    function readToken(expr: string, index: number): ParseInfo {
        // 1. Try to read a number
        let info = readNumber(expr, index);
        if (info !== null) {
            // Number successfully parsed
            return info;
        }

        // 2. Try to read an operator
        const op = Operator.parse(expr, index);
        if (op !== null) {
            // Yup, it's an operator
            return {
                token: new Token(op),
                charsRead: op.symbol.length
            };
        }

        // 3. Parenthesis or an argument separator
        const char = expr.charAt(index);
        if (char === "(" || char === ")" || char === ",") {
            return {
                token: new Token(char),
                charsRead: 1
            }
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
    function readNumber(expr: string, index: number): ParseInfo {
        // A flag used to keep track of whether a
        // decimal mark has been encountered.
        let decimalMark = 0;

        let i: number;
        for (i = index; i < expr.length; i++) {
            let charCode = expr.charCodeAt(i);

            if (charCode === ".".charCodeAt(0)) {
                // Decimal mark
                if (decimalMark === 1) {
                    // Second decimal mark encountered
                    break;
                }
                decimalMark = 1;
            } else if (charCode < "0".charCodeAt(0) || charCode > "9".charCodeAt(0)) {
                // Not a digit
                break;
            }
        }
        // Number of characters read while parsing the number
        const charsRead = i - index;

        if (charsRead - decimalMark === 0) {
            // No digits encountered while parsing, meaning
            // there is no number at the specified index in
            // the expression.
            return null;
        }

        // Numeric digits were encountered; parse the
        // characters that were read.
        const parsedNumber = Number(expr.substr(index, charsRead));

        return {token: new Token(parsedNumber), charsRead};
    }

    function readFunction(expr: string, index: number): ParseInfo {
        // First character must be alphabetic
        if (!isAlphabetic(expr, index)) {
            return null;
        }

        let i;
        for (i = index + 1; i < expr.length; i++) {
            if (!isAlphaNumeric(expr, i)) {
                break;
            }
        }

        const functionName = expr.substr(index, i);
        if (!FunctionMap.hasOwnProperty(functionName)) {
            // No function with such a name exists
            return null;
        }

        return {
            token: new Token(FunctionMap[functionName]),
            charsRead: i - index
        }
    }

    function isAlphabetic(str: string, index: number): boolean {
        const charCode = str.charCodeAt(index);
        return (charCode >= "a".charCodeAt(0) && charCode <= "z".charCodeAt(0))
            || (charCode >= "A".charCodeAt(0) && charCode <= "Z".charCodeAt(0));
    }

    function isAlphaNumeric(str: string, index: number): boolean {
        const charCode = str.charCodeAt(index);
        return charCode >= "0".charCodeAt(0) && charCode <= "9".charCodeAt(0)
            || (charCode >= "a".charCodeAt(0) && charCode <= "z".charCodeAt(0))
            || (charCode >= "A".charCodeAt(0) && charCode <= "Z".charCodeAt(0));
    }

}