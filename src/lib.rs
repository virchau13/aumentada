pub mod dice;
pub mod into_js;
pub mod from_js;
mod util;

use crate::into_js::IntoJs;
use crate::from_js::js_into_rust;

use neon::prelude::*;

#[macro_export]
macro_rules! make_obj {
    { $cx:expr, $($key:ident : $value:expr),+ } => {
        {
            let res = $cx.empty_object();
            $(
            {
                let js_v = $value.into_js($cx)?;
                res.set($cx, stringify!($key), js_v)?;
            }
            )+
            res
        }
    }
}

fn raw_eval_string(inp: &str) -> Result<(f64, Vec<(String, Vec<i64>)>), String> {
    let ast = dice::parse(inp)?;
    let mut rolls = Vec::new();
    let res = dice::eval(&ast, &mut rand::thread_rng(), &mut rolls)?;
    Ok((res, rolls))
}

fn eval_dice(mut cx: FunctionContext) -> JsResult<JsObject> {
    let inp: Handle<JsString> = cx.argument(0)?;
    let ret: Handle<JsObject> = cx.empty_object();
    match raw_eval_string(&inp.value(&mut cx)) {
        Ok((ans, rolls)) => {
            let js_ans = cx.number(ans).as_value(&mut cx);
            ret.set(&mut cx, "result", js_ans)?;
            let js_rolls = rolls.into_js(&mut cx)?;
            ret.set(&mut cx, "rolls", js_rolls)?;
        }
        Err(e) => {
            let js_err_str = cx.string(e).as_value(&mut cx);
            ret.set(&mut cx, "error", js_err_str)?;
        }
    }
    Ok(ret)
}

fn raw_bottomify(s: String) -> String {
    bottomify::bottom::encode_string(&s)
}
fn raw_unbottomify(s: String) -> Result<String, String> {
    bottomify::bottom::decode_string(&s).map_err(|x| x.why)
}

macro_rules! single_argument_fn_wrapper {
    ($func:ident) => {
        |mut cx: FunctionContext| {
            let js_arg: Handle<JsValue> = cx.argument(0)?;
            let arg = js_into_rust(&mut cx, js_arg)?;
            let res = $func(arg);
            res.into_js(&mut cx)
        }
    }
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
    cx.export_function("evalDice", eval_dice)?;
    cx.export_function("bottomify", single_argument_fn_wrapper!(raw_bottomify))?;
    cx.export_function("unbottomify", single_argument_fn_wrapper!(raw_unbottomify))?;
    Ok(())
}
