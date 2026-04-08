#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // lib.rs で定義した run() 関数を呼び出す
    deepsync_widget_lib::run(); 
}
