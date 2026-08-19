package main

import (
	"context"
	"log"
	"os"

	"be/internal/identity"
	"be/pkg/database"

	"github.com/gin-gonic/gin"
)

func main() {
	ctx := context.Background()
	pool, err := database.Connect(ctx)
	if err != nil {
		log.Printf("identity database unavailable: %v", err)
	}

	var repo identity.Repository
	if pool != nil {
		defer pool.Close()
		repo = identity.NewPostgresRepository(pool)
		log.Printf("identity: using postgres repository")
	} else {
		repo = identity.NewMemoryRepository()
		log.Printf("identity: using in-memory repository")
	}

	svc := identity.NewService(repo)

	adminEmail := os.Getenv("ADMIN_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin@example.com"
	}
	adminPassword := os.Getenv("ADMIN_PASSWORD")
	if adminPassword == "" {
		adminPassword = "admin123"
	}
	if err := svc.SeedAdmin(ctx, adminEmail, adminPassword); err != nil {
		log.Printf("seed admin failed: %v", err)
	} else {
		log.Printf("seed admin ok (%s)", adminEmail)
	}

	router := gin.Default()
	router.GET("/health", func(c *gin.Context) { c.JSON(200, gin.H{"service": "identity", "status": "ok"}) })
	identity.NewHandler(svc).RegisterRoutes(router)
	log.Fatal(router.Run(":8081"))
}
