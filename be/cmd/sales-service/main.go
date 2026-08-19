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

	var repo sales.Repository
	if pool != nil {
		defer pool.Close()
		repo = sales.NewPostgresRepository(pool)
		log.Printf("sales: using postgres repository")
	} else {
		repo = sales.NewMemoryRepository()
		log.Printf("sales: using in-memory repository")
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "sales", "status": "ok"}) })
	sales.NewHandler(sales.NewService(repo)).RegisterRoutes(router)
	log.Fatal(router.Run(":8084"))
}
