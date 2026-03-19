fn main() {
    println!("cargo:rerun-if-changed=../../database/migrations");
    println!("cargo:rerun-if-changed=../../database/seed/sample");
    println!("cargo:rerun-if-changed=../../database/seed/noauth");
}
