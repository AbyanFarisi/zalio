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
	if pool != nil {
		defer pool.Close()
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "product", "status": "ok"}) })
	productService := product.NewService(product.NewMemoryRepository())
	product.NewHandler(productService).RegisterRoutes(router)
	log.Fatal(router.Run(":8082"))
}
