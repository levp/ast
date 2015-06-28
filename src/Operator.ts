/**
 * Represents an operator that can produce a value using one or two operands.
 */
class Operator {
    /**
     * The textual representation of the operator in expressions.
     */
    public symbol: string;
    /**
     * Denotes the precedence of the operator compared to other operator.
     * A higher value indicates higher precedence.
     */
    public precedence: number;
    /**
     * Indicates whether the operator is left-associative (true) or right-associative (false).
     */
    public isLeftAssociative: boolean;
    /**
     * A function that performs the actual logic that this operator represents.
     */
    public func: (a: number, b?: number)=>number;
    /**
     * Number of operands the operator accepts (its arity).
     */
    public length: number;

    constructor(precedence: number, symbol: string, isLeftAssociative: boolean, func: (a: number, b?: number)=>number) {
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
    public toString(): string {
        return `Op{'${this.symbol}'}`
    }

    /**
     * An array of symbol-operator maps, each map only storing operators with the same symbol length.
     * The array is kept ordered by the symbol length.
     * This is used to allow operator symbols to be sub-strings of other operator symbols.
     */
    private static dictionary: {symbolLength: number, opMap: {[symbol: string]: Operator}}[] = [];

    public static parse(expr: string, startIndex: number): Operator {
        for (let entry of Operator.dictionary) {
            const endIndex = startIndex + entry.symbolLength;
            if (endIndex > expr.length) {
                // Operators with symbols as long or longer than this
                // cannot be present in the expression at the specified
                // index, as there are not enough characters left.
                continue;
            }

            // Creating sub-strings can be avoided, for example by using
            // hashes, but this naive solution should be enough for now.
            const testedString = expr.substring(startIndex, endIndex);

            const map = entry.opMap;
            if (map.hasOwnProperty(testedString)) {
                // Operator parsed!
                return map[testedString];
            }
        }

        // No such operator found
        return null;
    }

    private static register(op: Operator): void {
        const dic = Operator.dictionary;

        let entry = null;
        // 1. Check if there is already an entry in the dictionary
        //    for operators of this symbol-length.
        const opLength = op.symbol.length;
        for (let e of dic) {
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
            dic.sort((a, b) => b.symbolLength - a.symbolLength);
        }

        // 3. Add operator to map.
        const map = entry.opMap;
        const symbol = op.symbol;
        if (map.hasOwnProperty(symbol)) {
            throw new Error("Operator symbols must be unique.");
        }
        map[symbol] = op;
    }
}

// Create operators
new Operator(0, '+', true, (a, b) => a + b);
new Operator(0, '-', true, (a, b) => a - b);
new Operator(1, '*', true, (a, b) => a*b);
new Operator(1, '/', true, (a, b) => a/b);
new Operator(1, '%', true, (a, b) => a%b);
new Operator(2, '**', false, Math.pow);
new Operator(3, '~', false, (a) => -a);