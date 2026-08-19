package main

import (
	"context"
	"log"

	"be/internal/sales"
	"be/pkg/database"
	"github.com/gin-gonic/gin"
)

func main() {
	pool, err := database.Connect(context.Background())
	if err != nil {
		log.Printf("sales database unavailable: %v", err)
	}
	if pool != nil {
		defer pool.Close()
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "sales", "status": "ok"}) })
	salesService := sales.NewService(sales.NewMemoryRepository())
	sales.NewHandler(salesService).RegisterRoutes(router)
	log.Fatal(router.Run(":8084"))
}
