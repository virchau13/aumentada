pub fn float_to_int(f: f64) -> Option<i64> {
    if f.fract() == 0.0 {
        Some(f as i64)
    } else {
        None
    }
}
