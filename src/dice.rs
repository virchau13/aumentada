use crate::util::float_to_int;

use rand::seq::SliceRandom;
use rand::Rng;
use std::convert::TryFrom;
use std::fmt;

const MAX_DICE_ROLLS: usize = 1000;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Token {
    Plus,  // +
    Minus, // -
    /* PrefixPlus, // Not needed (`+x` is a noop). */
    Times,    // *
    DiceD,    // d
    DiceH,    // H
    DiceL,    // L
    LeftPar,  // (
    RightPar, // )
    Num(f64),
    Eof,
}

impl fmt::Display for Token {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{}",
            match self {
                Token::Plus => "+".to_string(),
                Token::Minus => "-".to_string(),
                Token::Times => "*".to_string(),
                Token::DiceD => "d".to_string(),
                Token::DiceH => "H".to_string(),
                Token::DiceL => "L".to_string(),
                Token::LeftPar => "(".to_string(),
                Token::RightPar => ")".to_string(),
                Token::Num(x) => format!("`{}`", x),
                Token::Eof => "EOF".to_string(),
            }
        )
    }
}

fn lex<'a>(source: &'a str) -> Result<Vec<Token>, String> {
    let mut src = source.chars().peekable();
    let mut res = Vec::<Token>::new();
    loop {
        while src.peek().unwrap_or(&'x').is_whitespace() {
            src.next();
        }
        let next_tok = match src.next() {
            None => break,
            Some(c) => match c {
                '+' => Ok(Token::Plus),
                '-' => Ok(Token::Minus),
                '*' => Ok(Token::Times),
                'd' => Ok(Token::DiceD),
                'h' | 'H' => Ok(Token::DiceH),
                'l' | 'L' => Ok(Token::DiceL),
                'k' | 'K' => match src.next() {
                    None => Err("invalid use of K".to_string()),
                    Some(p) => match p {
                        'h' | 'H' => Ok(Token::DiceH),
                        'l' | 'L' => Ok(Token::DiceL),
                        _ => Err("invalid use of K".to_string()),
                    },
                },
                '(' => Ok(Token::LeftPar),
                ')' => Ok(Token::RightPar),
                '0'..='9' => {
                    let mut num = String::with_capacity("2147483647".len());
                    let mut dec_point = true;
                    num.push(c);
                    loop {
                        match src.peek() {
                            None => break,
                            Some(x) => match x {
                                '0'..='9' => {
                                    num.push(*x);
                                    src.next();
                                }
                                '.' if dec_point => {
                                    num.push('.');
                                    dec_point = false;
                                    src.next();
                                }
                                _ => break,
                            },
                        }
                    }
                    // Unwrap'ed because it's impossible to be invalid
                    Ok(Token::Num(num.parse::<f64>().unwrap()))
                }
                _ => Err(format!("invalid character `{}`", c)),
            },
        };
        res.push(next_tok?);
    }
    Ok(res)
}

struct ParseIO {
    inp: Vec<Token>,
    curr: usize,
}

impl ParseIO {
    pub fn new(inp: Vec<Token>) -> ParseIO {
        ParseIO { inp, curr: 0 }
    }
    pub fn done(&self) -> bool {
        self.curr >= self.inp.len()
    }
    pub fn peek(&self) -> Token {
        if self.done() {
            Token::Eof
        } else {
            self.inp[self.curr]
        }
    }
    pub fn next(&mut self) -> Token {
        let res = self.peek();
        self.curr += 1;
        res
    }
    pub fn advance_eq(&mut self, tok: Token) -> bool {
        if self.peek() == tok {
            self.next();
            true
        } else {
            false
        }
    }
}

/*
 * grammar:
 * expr = add-expr;
 * <!-- add-expr and mul-expr are both binary exprs -->
 * add-expr = mul-expr [ (Plus | Minus) add-expr ];
 * mul-expr = unary-expr [ Times mul-expr ];
 * unary-expr = [ '-' | '+' ] dice-expr;
 * dice-expr = primary [ DiceD primary [ drop-expr ] ];
 *           | DiceD primary [ drop-expr ];
 * drop-expr = (DiceH | DiceL) primary;
 * primary = (Int | '(' expr ')');
 */

#[derive(Debug)]
pub enum Node {
    Unary(Box<UnaryExpr>),
    Binary(Box<BinExpr>),
    Dice(Box<DiceExpr>),
    Grouping(Box<Node>),
    Literal(Token),
    Nil,
}

impl fmt::Display for Node {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Node::Unary(x) => write!(f, "{}", x),
            Node::Binary(x) => write!(f, "{}", x),
            Node::Dice(x) => write!(f, "{}", x),
            Node::Grouping(x) => write!(f, "{}", x),
            Node::Literal(x) => write!(f, "{}", x),
            Node::Nil => write!(f, "`nil`"),
        }
    }
}

#[derive(Debug)]
pub struct UnaryExpr {
    op: Token,
    main: Node,
}

impl fmt::Display for UnaryExpr {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.op != Token::Eof {
            write!(f, "{} ", self.op)?;
        }
        write!(f, "({})", self.main)
    }
}

#[derive(Debug)]
pub struct BinExpr {
    op: Token,
    left: Node,
    right: Node,
}

impl fmt::Display for BinExpr {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({})", self.left)?;
        if self.op != Token::Eof {
            write!(f, " {} ({})", self.op, self.right)?;
        }
        Ok(())
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum Keep {
    High,
    Low,
}

#[derive(Debug)]
pub struct DropExpr {
    keep: Keep,
    num: Node,
}

impl fmt::Display for DropExpr {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "{} ({})",
            match self.keep {
                Keep::High => 'H',
                Keep::Low => 'L',
            },
            self.num
        )
    }
}

#[derive(Debug)]
pub struct DiceExpr {
    repeat: Option<Node>,
    sides: Node,
    drop: Option<DropExpr>,
}

impl fmt::Display for DiceExpr {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.repeat.is_some() {
            write!(f, "({}) ", self.repeat.as_ref().unwrap())?;
        }
        write!(f, "d ({})", self.sides)?;
        if self.drop.is_some() {
            write!(f, " ({})", self.drop.as_ref().unwrap())?;
        }
        Ok(())
    }
}

fn parse_primary(io: &mut ParseIO) -> Result<Node, String> {
    match io.next() {
        Token::LeftPar => {
            let res = Node::Grouping(Box::new(parse_expr(io)?));
            if !io.advance_eq(Token::RightPar) {
                Err(format!(
                    "expected `)` after expression, but got `{}`",
                    io.peek()
                ))
            } else {
                Ok(res)
            }
        }
        Token::Num(x) => Ok(Node::Literal(Token::Num(x))),
        _ => Err("invalid primary".to_string()),
    }
}

fn parse_dice_expr(io: &mut ParseIO) -> Result<Node, String> {
    let mut num: Option<Node> = None;
    if !io.advance_eq(Token::DiceD) {
        num = Some(parse_primary(io)?);
        if !io.advance_eq(Token::DiceD) {
            return Ok(num.unwrap());
        }
    }
    let sides = parse_primary(io)?;
    let mut drop: Option<DropExpr> = None;
    match io.peek() {
        Token::DiceH | Token::DiceL => {
            let keep = if io.next() == Token::DiceH {
                Keep::High
            } else {
                Keep::Low
            };
            let num_drop = parse_primary(io)?;
            drop = Some(DropExpr {
                keep,
                num: num_drop,
            });
        }
        _ => (),
    }
    Ok(Node::Dice(Box::new(DiceExpr {
        repeat: num,
        sides,
        drop,
    })))
}

const BINEXPR_OPS_LEN: usize = 3;

const BINEXPR_OPS: [(usize, Token); BINEXPR_OPS_LEN] =
    [(0, Token::Plus), (0, Token::Minus), (1, Token::Times)];

fn parse_unary_expr(io: &mut ParseIO) -> Result<Node, String> {
    let mut op = Token::Eof;
    match io.peek() {
        Token::Plus | Token::Minus => op = io.next(),
        _ => (),
    }
    Ok(Node::Unary(Box::new(UnaryExpr {
        op,
        main: parse_dice_expr(io)?,
    })))
}

fn parse_binexpr(io: &mut ParseIO, prec: usize) -> Result<Node, String> {
    if prec >= BINEXPR_OPS.len() {
        return parse_unary_expr(io);
    }
    let left = parse_binexpr(io, prec + 1)?;
    let mut op = Token::Eof;
    let mut right = Node::Nil;
    for i in 0..BINEXPR_OPS_LEN {
        if BINEXPR_OPS[i].0 == prec && io.advance_eq(BINEXPR_OPS[i].1) {
            op = BINEXPR_OPS[i].1;
            right = parse_binexpr(io, prec)?;
            break;
        }
    }
    Ok(Node::Binary(Box::new(BinExpr { left, op, right })))
}

fn parse_expr(io: &mut ParseIO) -> Result<Node, String> {
    parse_binexpr(io, 0)
}

pub fn parse(src: &str) -> Result<Node, String> {
    let mut io = ParseIO::new(lex(src)?);
    /* print!("tok: ");
    for i in io.inp.iter() {
        print!("{} ", i);
    }
    println!(""); */
    let res = parse_expr(&mut io);
    if res.is_err() {
        return res;
    }
    match io.done() {
        true => res,
        false => Err(format!("expression is not fully consumed (last token `{}`), perhaps you didn't finish your message?", io.peek())),
    }
}

pub fn eval(
    node: &Node,
    rng: &mut rand::rngs::ThreadRng,
    rolls: &mut Vec<(String, Vec<i64>)>,
) -> Result<f64, String> {
    match node {
        Node::Unary(x) => {
            let mut res = eval(&x.main, rng, rolls)?;
            if x.op == Token::Minus {
                res = -res;
            }
            Ok(res)
        }
        Node::Binary(x) => {
            let l = eval(&x.left, rng, rolls)?;
            if x.op == Token::Eof {
                return Ok(l);
            }
            let r = eval(&x.right, rng, rolls)?;
            match x.op {
                Token::Plus => Ok(l + r),
                Token::Minus => Ok(l - r),
                Token::Times => Ok(l * r),
                _ => Err("(INTERNAL ERROR) Invalid binary op".to_string()),
            }
        }
        Node::Grouping(x) => eval(x, rng, rolls),
        Node::Literal(x) => match x {
            Token::Num(i) => Ok(*i),
            _ => Err("(INTERNAL ERROR) Invalid literal op".to_string()),
        },
        Node::Dice(expr) => {
            let mut str_repr = "".to_string();
            let rep_signed = match &expr.repeat {
                Some(n) => {
                    let res = eval(&n, rng, rolls)?;
                    str_repr += &res.to_string();
                    res
                }
                None => 1.,
            };
            str_repr.push('d');
            let repeat: usize;
            if let Some(repeat_) = float_to_int(rep_signed) {
                if repeat_ < 0 {
                    return Err("Cannot roll a negative amount of dice".to_string());
                }
                repeat = repeat_ as usize;
            } else {
                return Err("Cannot roll a fractional amount of dice".to_string());
            }
            if repeat > MAX_DICE_ROLLS {
                return Err(format!(
                    "Cannot roll more than {} dice at once",
                    MAX_DICE_ROLLS
                ));
            }
            let sides = float_to_int(eval(&expr.sides, rng, rolls)?)
                .ok_or("Cannot roll a dice with a fractional amount of sides".to_string())?;
            str_repr += &sides.to_string();
            if sides <= 0 {
                return Err("Cannot roll a less than 1-sided die".to_string());
            }
            let mut res = Vec::<i64>::with_capacity(repeat);
            for _ in 0..repeat {
                res.push(rng.gen_range(1..sides + 1));
            }
            let sum: i64;
            match &expr.drop {
                None => {
                    sum = res.iter().sum();
                }
                Some(drop) => {
                    let keep_num_signed = float_to_int(eval(&drop.num, rng, rolls)?)
                        .ok_or("Cannot keep a fractional amount of dice".to_string())?;
                    let keep_num: usize;
                    match usize::try_from(keep_num_signed) {
                        Ok(x) => keep_num = x,
                        Err(_) => {
                            return Err("Cannot keep a negative number of dice".to_string());
                        }
                    }
                    str_repr.push(if drop.keep == Keep::Low { 'L' } else { 'H' });
                    str_repr += &keep_num.to_string();
                    sum = if keep_num >= repeat {
                        res.iter().sum()
                    } else {
                        res.sort_unstable();
                        if drop.keep == Keep::Low {
                            res.reverse();
                        }
                        let tmp = res.iter().skip(repeat - keep_num - 1).sum();
                        res.shuffle(rng);
                        tmp
                    }
                }
            }
            rolls.push((str_repr, res));
            Ok(sum as f64)
        }
        Node::Nil => Err("cannot eval a Nil value".to_string()),
    }
}
