use std::mem;
use std::ffi::{CString, CStr};
use std::os::raw::c_void;
extern crate serde;
extern crate serde_json;

#[macro_use] extern crate serde_derive;

#[derive(Serialize, Deserialize, Debug)]
struct StateShape {
    red: u32,
    blue: u32,
    invalid: u32,
}

static mut STATE : StateShape = StateShape { red: 0, blue: 0, invalid: 0 };

#[no_mangle]
pub extern "C" fn alloc() -> *mut c_void {
    let mut buf = Vec::with_capacity(1024);
    let ptr = buf.as_mut_ptr();

    mem::forget(buf);

    ptr
}

#[no_mangle]
pub unsafe extern "C" fn dealloc(ptr: *mut c_void) {
    let _ = Vec::from_raw_parts(ptr, 0, 1024);
}

#[no_mangle]
unsafe fn get_return_string(string_content: String, ptr: *mut u8) -> () {
    let c_headers = CString::new(string_content).unwrap();

    let bytes = c_headers.as_bytes_with_nul();

    let header_bytes = std::slice::from_raw_parts_mut(ptr, 1024);

    header_bytes[..bytes.len()].copy_from_slice(bytes);
}

#[no_mangle]
pub unsafe fn vote(ptr: *mut u8) {
    let str_content = CStr::from_ptr(ptr as *const i8).to_str().unwrap();
    if str_content == "red" {
        STATE.red += 1;
    } else if str_content == "blue" {
        STATE.blue += 1;
    } else {
        STATE.invalid += 1;
    }
}

#[no_mangle]
pub unsafe extern "C" fn get_state(ptr: *mut u8) {
    // export state as JSON
    let string_content = serde_json::to_string(&STATE).unwrap();
    get_return_string(string_content, ptr);
}

#[no_mangle]
pub unsafe fn apply_state(ptr: *mut u8) {
    let input_string = CStr::from_ptr(ptr as *const i8).to_str().unwrap();
    let input_state: StateShape = serde_json::from_str(input_string).unwrap();
    STATE = input_state;
}

