package main

import (
	"context"
	"log"

	"be/internal/product"
	"be/pkg/database"

	"github.com/gin-gonic/gin"
)

func main() {
	pool, err := database.Connect(context.Background())
	if err != nil {
		log.Printf("product database unavailable: %v", err)
	}

	var repo product.Repository
	if pool != nil {
		defer pool.Close()
		repo = product.NewPostgresRepository(pool)
		log.Printf("product: using postgres repository")
	} else {
		repo = product.NewMemoryRepository()
		log.Printf("product: using in-memory repository")
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "product", "status": "ok"}) })
	product.NewHandler(product.NewService(repo)).RegisterRoutes(router)
	log.Fatal(router.Run(":8082"))
}
