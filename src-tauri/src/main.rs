// DeepSync Widget — Tauri Backend Entry Point
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    deepsync_widget_lib::run();
}
