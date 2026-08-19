package product

import "github.com/gin-gonic/gin"

// Handler translates HTTP requests into product use-case calls.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	products, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "failed to list products"})
		return
	}
	c.JSON(200, products)
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.GET("/products", h.List)
}
