package main

import (
	"context"
	"log"

	"be/pkg/database"
	"github.com/gin-gonic/gin"
)

func main() {
	pool, err := database.Connect(context.Background())
	if err != nil { log.Printf("identity database unavailable: %v", err) }
	if pool != nil { defer pool.Close() }

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "identity", "status": "ok"}) })
	log.Fatal(router.Run(":8081"))
}