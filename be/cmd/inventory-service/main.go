package main

import (
	"context"
	"log"

	"be/internal/inventory"
	"be/pkg/database"
	"github.com/gin-gonic/gin"
)

func main() {
	pool, err := database.Connect(context.Background())
	if err != nil {
		log.Printf("inventory database unavailable: %v", err)
	}
	if pool != nil {
		defer pool.Close()
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "inventory", "status": "ok"}) })
	inventoryService := inventory.NewService(inventory.NewMemoryRepository())
	inventory.NewHandler(inventoryService).RegisterRoutes(router)
	log.Fatal(router.Run(":8083"))
}
