package inventory

import "github.com/gin-gonic/gin"

// Handler translates HTTP requests into inventory use-case calls.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	stocks, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to list stocks"})
		return
	}
	c.JSON(200, stocks)
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.GET("/stocks", h.List)
}
