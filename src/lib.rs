use std::mem;
use std::ffi::{CString, CStr};
use std::os::raw::c_void;

static mut COUNTER: u32 = 0;

static mut VOTES_RED : u32 = 0;
static mut VOTES_BLUE : u32 = 0;

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
pub unsafe extern "C" fn greet(ptr: *mut u8) {
    COUNTER += 1;
    let str_content = CStr::from_ptr(ptr as *const i8).to_str().unwrap();
    let mut string_content = String::from("Hello, ");

    string_content.push_str(COUNTER.to_string().as_str());
    string_content.push_str(" ");
    string_content.push_str(str_content);
    string_content.push_str("!");

    get_return_string(string_content, ptr);
}

#[no_mangle]
unsafe fn get_return_string(string_content: String, ptr: *mut u8) -> () {
    let c_headers = CString::new(string_content).unwrap();

    let bytes = c_headers.as_bytes_with_nul();

    let header_bytes = std::slice::from_raw_parts_mut(ptr, 1024);

    header_bytes[..bytes.len()].copy_from_slice(bytes);
}

#[no_mangle]
pub fn vote(ptr: *mut u8) {
    unsafe {
        let str_content = CStr::from_ptr(ptr as *const i8).to_str().unwrap();
        if str_content == "red" {
            VOTES_RED += 1;
        } else if str_content == "blue" {
            VOTES_BLUE += 1;
        }
    }
}

