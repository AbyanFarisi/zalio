package sales

import "github.com/gin-gonic/gin"

// Handler translates HTTP requests into sales use-case calls.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	orders, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to list orders"})
		return
	}
	c.JSON(200, orders)
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.GET("/orders", h.List)
}
