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

	var repo finance.Repository
	if pool != nil {
		defer pool.Close()
		repo = finance.NewPostgresRepository(pool)
		log.Printf("finance: using postgres repository")
	} else {
		repo = finance.NewMemoryRepository()
		log.Printf("finance: using in-memory repository")
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "finance", "status": "ok"}) })
	finance.NewHandler(finance.NewService(repo)).RegisterRoutes(router)
	log.Fatal(router.Run(":8085"))
}
