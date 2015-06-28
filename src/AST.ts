module AST {
    export function create(tokens: Token[]): ExprNode {
        const exprStack: ExprNode[] = [];
        const opStack: Token[] = [];

        for (let token of tokens) {
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
                    const op = <Operator> token.value;

                    // Start popping all tokens off the top of the stack until
                    // at least one of the following conditions is met:
                    // [1] Stack runs out of tokens
                    // [2] Popped token is not an operator (eg. parentheses)
                    // [3] Current operator is LEFT-associative with precedence
                    //     LESS OR EQUAL to that of the popped operator.
                    // [4] Current operator is RIGHT-associative with precedence
                    //     LESS than that of the popped operator.
                    while (opStack.length > 0) { // [1]
                        const nextOp: Token = opStack[opStack.length - 1];

                        if (nextOp.type !== TokenType.Operator) {
                            // [2]
                            break;
                        }
                        if (op.isLeftAssociative && op.precedence > (<Operator> nextOp.value).precedence) {
                            // [3]
                            break;
                        }
                        if (!op.isLeftAssociative && op.precedence >= (<Operator> nextOp.value).precedence) {
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
                        const nextOp = peek(opStack);
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
            const next: Token = peek(opStack);
            if (next.type === TokenType.LeftParenthesis) {
                // Mismatched left parenthesis
                throw new Error("Mismatched left parenthesis, '('.");
            }
            popOperator(opStack, exprStack);
        }

        return exprStack.pop();
    }

    function popOperator(opStack: Token[], exprStack: ExprNode[]): void {
        const token = opStack.pop();

        if (token.type !== TokenType.Function && token.type !== TokenType.Operator) {
            throw new Error("Invalid operator or function token.");
        }

        let argCount = token.value.length;
        // (Token value is either an Operator or a function)

        if (argCount > exprStack.length) {
            throw new Error("Not enough expressions on the stack.");
        }
        // Pop arguments
        const args: ExprNode[] = new Array(argCount);
        for (let i = argCount - 1; i >= 0; i--) {
            args[i] = exprStack.pop();
        }

        // Add new node
        exprStack.push(new ExprNode(token, args));
    }

    function peek<T>(array: T[]): T {
        return array[array.length - 1];
    }
}