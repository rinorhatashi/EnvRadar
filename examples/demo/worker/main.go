package main

import (
	"fmt"
	"os"
)

func main() {
	databaseURL := os.Getenv("DATABASE_URL")
	redisURL := os.Getenv("REDIS_URL")
	fmt.Println(databaseURL, redisURL)
}
