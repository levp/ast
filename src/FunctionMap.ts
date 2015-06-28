/**
 * Contains all recognizable functions mapped to their names.
 */
var FunctionMap = {
    max: function max(a: number, b: number): number {
        return (a > b) ? a : b;
    },
    min: function min(a: number, b: number): number {
        return (a < b) ? a : b;
    },
    rand: function rand(): number {
        return Math.random();
    },
    floor: function floor(a: number): number {
        return Math.floor(a);
    },
    ceil: function ceil(a: number): number {
        return Math.ceil(a);
    },
    round: function round(a: number): number {
        return Math.round(a);
    },
};