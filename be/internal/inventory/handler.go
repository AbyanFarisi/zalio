package inventory

import (
	"errors"
	"net/http"

	"be/pkg/authtoken"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

type stockPayload struct {
	ProductID string `json:"product_id" binding:"required"`
	Warehouse string `json:"warehouse" binding:"required"`
	Quantity  int    `json:"quantity"`
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list stocks"})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) Get(c *gin.Context) {
	s, err := h.service.Get(c.Request.Context(), c.Param("id"))
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "stock not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *Handler) Create(c *gin.Context) {
	var req stockPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	s, err := h.service.Create(c.Request.Context(), Stock{ProductID: req.ProductID, Warehouse: req.Warehouse, Quantity: req.Quantity})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, s)
}

func (h *Handler) Update(c *gin.Context) {
	var req stockPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	s, err := h.service.Update(c.Request.Context(), Stock{ID: c.Param("id"), ProductID: req.ProductID, Warehouse: req.Warehouse, Quantity: req.Quantity})
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "stock not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, s)
}

func (h *Handler) Delete(c *gin.Context) {
	if err := h.service.Delete(c.Request.Context(), c.Param("id")); err != nil {
		if errors.Is(err, ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "stock not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *Handler) RegisterRoutes(router *gin.Engine) {
	router.GET("/stocks", h.List)
	router.GET("/stocks/:id", h.Get)

	protected := router.Group("")
	protected.Use(authtoken.RequireBearer())
	protected.POST("/stocks", h.Create)
	protected.PUT("/stocks/:id", h.Update)
	protected.DELETE("/stocks/:id", h.Delete)
}
