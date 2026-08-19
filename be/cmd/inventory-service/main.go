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

	var repo inventory.Repository
	if pool != nil {
		defer pool.Close()
		repo = inventory.NewPostgresRepository(pool)
		log.Printf("inventory: using postgres repository")
	} else {
		repo = inventory.NewMemoryRepository()
		log.Printf("inventory: using in-memory repository")
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "inventory", "status": "ok"}) })
	inventory.NewHandler(inventory.NewService(repo)).RegisterRoutes(router)
	log.Fatal(router.Run(":8083"))
}
