package product

import (
	"errors"
	"net/http"

	"be/pkg/authtoken"

	"github.com/gin-gonic/gin"
)

// Handler menerjemahkan HTTP menjadi use case product.
type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type productPayload struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	Price       float64 `json:"price"`
}

func (h *Handler) List(c *gin.Context) {
	products, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list products"})
		return
	}
	c.JSON(http.StatusOK, products)
}

func (h *Handler) Get(c *gin.Context) {
	p, err := h.service.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) Create(c *gin.Context) {
	var req productPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p, err := h.service.Create(c.Request.Context(), Product{Name: req.Name, Description: req.Description, Price: req.Price})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, p)
}

func (h *Handler) Update(c *gin.Context) {
	var req productPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	p, err := h.service.Update(c.Request.Context(), Product{ID: c.Param("id"), Name: req.Name, Description: req.Description, Price: req.Price})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Request.Context(), c.Param("id")); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// RegisterRoutes: GET public, write endpoints diproteksi Bearer token.
func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.GET("/products", h.List)
	router.GET("/products/:id", h.Get)

	protected := router.Group("")
	protected.Use(authtoken.RequireBearer())
	protected.POST("/products", h.Create)
	protected.PUT("/products/:id", h.Update)
	protected.DELETE("/products/:id", h.Delete)
}
