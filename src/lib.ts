const Rust = require('../dist/index.node');

type Rolls = [string, number[]][];

type RustResult<T, E> = { error: E } | { result: T };

export const evalDice: (
    s: string
) => { result: number; rolls: Rolls } | { error: string } = Rust.evalDice;
export const bottomify: (s: string) => string = Rust.bottomify;
export const unbottomify: (s: string) => RustResult<string, string> = Rust.unbottomify;
