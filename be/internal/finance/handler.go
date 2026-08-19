package finance

import "github.com/gin-gonic/gin"

// Handler translates HTTP requests into finance use-case calls.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	transactions, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to list transactions"})
		return
	}
	c.JSON(200, transactions)
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.GET("/transactions", h.List)
}
