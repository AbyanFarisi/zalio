package main

import (
	"context"
	"log"

	"be/internal/finance"
	"be/pkg/database"
	"github.com/gin-gonic/gin"
)

func main() {
	pool, err := database.Connect(context.Background())
	if err != nil {
		log.Printf("finance database unavailable: %v", err)
	}
	if pool != nil {
		defer pool.Close()
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "finance", "status": "ok"}) })
	financeService := finance.NewService(finance.NewMemoryRepository())
	finance.NewHandler(financeService).RegisterRoutes(router)
	log.Fatal(router.Run(":8085"))
}
