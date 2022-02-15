use neon::prelude::*;
use neon::context::Context;

use crate::make_obj;

/// Turns a type into its closest JavaScript counterpart.
pub trait IntoJs {
    fn into_js<'a, 'b, C: Context<'b>>(&self, cx: &'a mut C) -> JsResult<'b, JsValue>;
}

impl<T: IntoJs, E: IntoJs> IntoJs for Result<T, E> {
    fn into_js<'a, 'b, C: Context<'b>>(&self, cx: &'a mut C) -> JsResult<'b, JsValue> {
        match self {
            Ok(v) => {
                cx.type_error("x")?;
                Ok(make_obj! { cx,
                    result: v
                }.upcast())
            },
            Err(e) => {
                Ok(make_obj! { cx,
                    error: e
                }.upcast())
            }
        }
    }
}

impl<T> IntoJs for Vec<T> where T: IntoJs {
    fn into_js<'a, 'b, C: Context<'b>>(&self, cx: &'a mut C) -> JsResult<'b, JsValue> {
        let arr = cx.empty_array();
        for (i, v) in self.iter().enumerate() {
            let v_js = v.into_js(cx)?;
            arr.set(cx, i as u32, v_js)?;
        }
        Ok(arr.upcast())
    }
}

impl IntoJs for String {
    fn into_js<'a, 'b, C: Context<'b>>(&self, cx: &'a mut C) -> JsResult<'b, JsValue> {
        Ok(cx.string(self).upcast())
    }
}

impl IntoJs for i64 {
    fn into_js<'a, 'b, C: Context<'b>>(&self, cx: &'a mut C) -> JsResult<'b, JsValue> {
        // the best we can do
        Ok(cx.number(*self as f64).upcast())
    }
}

macro_rules! tuple_into_js {
    { $h:ident,$hn:tt, $($t:ident,$tn:tt),* } => {
        impl<$h:IntoJs, $($t: IntoJs),+> IntoJs for ($h, $($t),+) {
            fn into_js<'a, 'b, C: Context<'b>>(&self, cx: &'a mut C) -> JsResult<'b, JsValue> {
                let arr = cx.empty_array();
                $(
                    tuple_into_js!(@single_set_tuple self,cx,arr,$tn);
                )+
                tuple_into_js!(@single_set_tuple self,cx,arr,$hn);
                Ok(arr.upcast())
            }
        }
        tuple_into_js! { $($t,$tn),* }
    };
    { @single_set_tuple $self:expr,$cx:expr,$arr:expr,$tn:tt } => {
        {
            let v = $self.$tn.into_js($cx)?;
            $arr.set($cx, $tn as u32, v)?;
        }
    };
    { $h:ident, $hn:tt } => { /* unnecessary, see below */ }
}

impl<T: IntoJs> IntoJs for (T, ) {
    fn into_js<'a, 'b, C: Context<'b>>(&self, cx: &'a mut C) -> JsResult<'b, JsValue> {
        let arr = cx.empty_array();
        let v = self.0.into_js(cx)?;
        arr.set(cx, 0u32, v)?;
        Ok(arr.upcast())
    }
}

tuple_into_js! { T3,3,T2,2,T1,1,T0,0 }
