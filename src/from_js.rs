use neon::prelude::*;

pub trait FromJs where Self: Sized {
    fn from_js<'a, 'b>(cx: &'a mut FunctionContext<'b>, js: Handle<'b, JsValue>) -> NeonResult<Self>;
}

impl FromJs for String {
    fn from_js<'a, 'b>(cx: &'a mut FunctionContext<'b>, js: Handle<'b, JsValue>) -> NeonResult<Self> {
        let js_str: Handle<JsString> = js.downcast_or_throw(cx)?;
        Ok(js_str.value(cx))
    }
}

impl<T: FromJs> FromJs for Vec<T> {
    fn from_js<'a, 'b>(cx: &'a mut FunctionContext<'b>, js: Handle<'b, JsValue>) -> NeonResult<Self> {
        let js_arr: Handle<JsArray> = js.downcast_or_throw(cx)?;
        let arr = js_arr.to_vec(cx)?;
        let res: Vec<T> = arr.into_iter().map(|x| T::from_js(cx, x)).collect::<Result<_,_>>()?;
        Ok(res)
    }
}

pub fn js_into_rust<'a, 'b, T: FromJs>(cx: &'a mut FunctionContext<'b>, js: Handle<'b, JsValue>) -> NeonResult<T> {
    T::from_js(cx, js)
}
