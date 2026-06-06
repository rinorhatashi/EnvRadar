fn main() {
    let database_url = std::env::var("DATABASE_URL").unwrap_or_default();
    println!("connecting to {database_url}");
}
